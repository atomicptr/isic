const EventEmitter = require("events")

const DiscordHandler = require("./DiscordHandler")
const ModuleManager = require("./ModuleManager")
const Module = require("./Module")

const crypto = require("crypto")
const request = require("request")
const fs = require("fs")
const path = require("path")

const mkdirp = require("mkdirp")
const lowdb = require("lowdb")

class Bot extends EventEmitter {
    constructor(config) {
        super()

        if(!config || !config.discordToken) {
            throw "No Discord bot token found."
        }

        const defaultSettings = {
            intervalInSeconds: 300,
            administrators: [],
            modulePaths: [],
            loadModules: true,
            useBuiltinActions: true,
            botAdminRightsAlsoApplyInServers: false,
            databaseLocation: "data/"
        }

        this.config = Object.assign({}, defaultSettings, config)
        this.client = new DiscordHandler(this, this.config.discordToken)

        this.moduleManager = new ModuleManager(this)
        this.builtins = null

        this.dbs = {}

        this.isSetup = false

        this.client.on("ready", this.onReady.bind(this))
    }

    get discord() {
        return this.client
    }

    get clientUser() {
        return this.client.user
    }

    // should only be called from bot internals
    get log() {
        return {
            // TODO: add a logger here
            info: (...message) => console.log("[INFO]", ...message),
            debug: (...message) => console.log("[DEBUG]", ...message),
            error: (...message) => console.error("[ERR]", ...message),
            warn: (...message) => console.warn("[WARN]", ...message)
        }
    }

    // logs with context wohoo
    get contextLog() {
        return {
            // TODO: add a logger here
            info: (context, ...message) => console.log("[INFO]", ...message),
            debug: (context, ...message) => console.log("[DEBUG]", ...message),
            error: (context, ...message) => console.error("[ERR]", ...message),
            warn: (context, ...message) => console.warn("[WARN]", ...message)
        }
    }

    onReady() {
        this.log.info(`Bot ${this.clientUser.username}#${this.clientUser.discriminator} ready event triggered`)

        // setup
        if(!this.isSetup) {
            const dbpath = path.resolve(process.cwd(), this.config.databaseLocation)
            if(!fs.existsSync(dbpath)) {
                mkdirp.sync(dbpath)
            }

            // register builtins
            if(this.config.useBuiltinActions) {
                this.builtins = this.moduleManager.registerModule(
                    {identifier: "builtins"}, this.registerBuiltins.bind(this))
            }

            // load modules from paths
            if(this.config.loadModules) {
                for(let modulePath of this.config.modulePaths) {
                    this.moduleManager.loadModulesFromDirectory(modulePath)
                }
            }

            this.client.on("message", this.onMessage.bind(this))

            this.intervalId = setInterval(() => this.emit("interval"), this.config.intervalInSeconds * 1000)

            this.emit("setup")
            this.isSetup = true
        }

        this.emit("ready")
        this.emit("interval")
    }

    onMessage(message) {
        this.log.debug(`${message.author.bot ? "[BOT] " : ""}${message.author.username}#${message.author.discriminator} (${message.author.id}): ${message.content}`)

        // don't listen to yourself or other bots
        if(message.author.id !== this.clientUser.id && !message.author.bot) {
            this.moduleManager.onMessage(message)
        }

        this.emit("message", message)
    }

    command(commandName, callback) {
        return this.builtins.command(commandName, callback)
    }

    hear(regex, callback) {
        return this.builtins.hear(regex, callback)
    }

    respond(regex, callback) {
        return this.builtins.respond(regex, callback)
    }

    interval(ident, callback) {
        return this.builtins.interval(ident, callback)
    }

    hash(str) {
        const sha = crypto.createHash("sha256")
        sha.update(str)
        return sha.digest("hex")
    }

    request(args) {
        return request.apply(null, arguments)
    }

    db(handle) {
        if(!handle) {
            this.log.error("handle was null?", handle)
            return null
        }

        // to be able to handle just responses, makes it easier to support DMs with the bot
        if(handle.constructor.name === "Response") {
            if(handle.server) {
                return this.db(handle.server)
            }

            if(handle.channel.type === "dm") {
                return this.db(handle.author)
            }
        } else if(handle.constructor.name === "Guild") {
            return this.rawdb(`S${handle.id}`)
        } else if(handle.constructor.name === "User" || handle.constructor.name === "ClientUser") {
            return this.rawdb(`U${handle.id}`)
        }

        if(!handle.id) {
            this.log.error("Unknown handle, can't create db from it: ", handle)
            return null
        }

        return this.rawdb(handle.id)
    }

    rawdb(dbName) {
        if(!this.dbs[dbName]) {
            this.dbs[dbName] = lowdb(path.resolve(process.cwd(), this.config.databaseLocation, `${dbName}.json`), {
                writeOnChange: true,
                storage: require("lowdb/lib/file-async")
            })
        }

        return this.dbs[dbName]
    }

    get mydb() {
        return this.db(this.client.user)
    }

    forEveryDatabase(condition, callback) {
        condition = condition || function() {return true}
        callback = callback || function() {}

        return new Promise((resolve, reject) => {
            fs.readdir(path.resolve(process.cwd(), this.config.databaseLocation), (err, items) => {
                if(err) {
                    this.log.error(err)
                    reject(err)
                    return
                }

                function getDatabaseOwners(prefix, getOwner) {
                    let databases = items.filter(i => i.startsWith(prefix))

                    let owners = []

                    for(let db of databases) {
                        let regex = new RegExp(`${prefix}(.*)\.json`, "g")

                        let matches = regex.exec(db)

                        if(matches.length > 1) {
                            const id = matches[1]
                            owners.push(getOwner(id))
                        }
                    }

                    return owners
                }

                let servers = getDatabaseOwners("S", id => this.client.guilds.get(id))
                let users = getDatabaseOwners("U", id => this.client.users.get(id))

                let owners = servers.concat(users)

                try {
                    let filtered = owners.map(o => ({owner: o, db: this.db(o)})).filter(pair => condition(pair.owner, pair.db))

                    filtered.forEach(pair => callback(pair.owner, pair.db))

                    resolve(filtered)
                } catch(ex) {
                    this.log.error(ex)
                    reject(ex)
                }
            })
        })
    }

    registerBuiltins(mod) {
        this.log.debug("Register builtin actions:")

        mod.respond(/ping/g, res => {
            res.reply("PONG")
        })

        mod.respond(/(who am i|whoami)/g, res => {
            res.sendEmbed("Here is the information you've requested.", embed => {
                let author = res.message.author

                embed.addField(`ID`, `${author.id}`)
                embed.addField(`Username`, `${author.username}#${author.discriminator}`)
                embed.addField(`Created at`, `${author.createdAt.toISOString().slice(0, 10)}`)
                embed.setImage(author.avatarURL)
            })
        })

        mod.respond(/am i admin/g, res => {
            if(res.authorIsAdministrator && res.authorIsServerAdministrator) {
                res.reply("Yes, master.")
            } else if(res.authorIsAdministrator && !res.authorIsServerAdministrator) {
                res.reply("Yes you are my master, but I can't help you on this server :'(")
            } else if(res.authorIsServerAdministrator) {
                res.reply("Yes you have Administrator rights on this server.")
            } else {
                res.reply("No.")
            }
        })

        mod.command("botlink", (res, args) => {
            if(res.authorIsAdministrator) {
                res.sendDirectMessage(`You can add me to servers by using this URL:\n\n` +
                    `https://discordapp.com/api/oauth2/authorize?client_id=${this.client.user.id}&scope=bot&permissions=0`)
                res.send(":ok_hand:")
            } else {
                res.send(":thumbsdown:")
            }
        })

        mod.command("setusername", (res, args) => {
            if(res.authorIsAdministrator) {
                let newUsername = args.join(" ")
                this.client.user.setUsername(newUsername)
                res.reply("I've changed my username to " + newUsername)
            } else {
                res.reply("You don't have permission to do mod.")
            }
        })

        mod.command("setavatar", (res, args) => {
            if(res.authorIsAdministrator) {
                const request = require("request").defaults({ encoding: null })

                let url = args[0]

                request.get(url, (err, response, body) => {
                    if(!err && response.statusCode == 200) {
                        const data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString("base64")
                        this.client.user.setAvatar(data)
                        res.reply("I've changed my avatar to <" + url + ">, does it suit me? :)")
                    } else {
                        res.reply("I was not able to change my avatar to <" + url + "> :(")
                    }
                })
            } else {
                res.reply("You don't have permission to do this, scrub.")
            }
        })

        mod.command("hcf", (res, args) => {
            if(res.authorIsAdministrator) {
                res.reply("Aye, sir! I will proceed to kill myself.").then(_ => process.exit(0))
            } else {
                res.reply("You don't have the permission to initiate the self destruct protocol v2.1...")
            }
        })

        mod.command("prune", (res, args) => {
            if(res.authorIsServerAdministrator) {
                if(args.length > 0) {
                    if(!isNaN(args[0])) {
                        if(res.canI("MANAGE_MESSAGES")) {
                            // +1 since you also want to get rid of the message saying "!prune 2"
                            res.message.channel.bulkDelete(Number(args[0]) + 1).then(messages => {
                                res.send(`Deleted ${messages.array().length - 1} messages and added this one! :wastebasket:`).then(message => {
                                    message.delete(5000) // delete this message after 5s
                                })
                            }).catch(err => {
                                this.log.error(err.response.body.message)
                                res.send(err.response.body.message)
                            })
                        } else {
                            res.send("I'd love to clean up your mess, but I don't have the permission to manage messages... :angry:")
                        }
                    } else {
                        res.send("What is this \"" + args[0] + "\", doesn't look like a number for me :(")
                    }
                } else {
                    res.reply("I appreciate the idea of me cleaning this room but you could at least tell me how much you want me to delete :P")
                }
            } else {
                res.reply("You don't have the permission to do this mate...")
            }
        })
    }
}

module.exports = Bot
