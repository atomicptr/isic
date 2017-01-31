const ActionParser = require("./ActionParser")
const ModuleManager = require("./ModuleManager.js")

const Discord = require("discord.js")
const lowdb = require("lowdb")
const path = require("path")
const fs = require("fs")

const crypto = require("crypto")
const request = require("request")

class Bot {
    constructor(config) {
        const defaultSettings = {
            "modulePaths": ["node_modules"],
            "intervalInSeconds": 300,
            "loadModules": true,
            "useBuiltinActions": true,
            "administrators": [],
            "botAdminRightsAlsoApplyInServers": true,
            "databaseLocation": "data/"
        }

        this.client = new Discord.Client()

        this.config = Object.assign({}, defaultSettings, config)
        this.dbs = {}

        if(this.config.loadModules) {
            this.moduleManager = new ModuleManager(this.config.modulePaths)
        } else {
            console.warn("WARN: You've disabled the ability to load modules.")
        }

        this.actions = new ActionParser(this)
        this.intervalActions = {}
        this.messageObservers = []

        this._isReady = false
        this._isSetup = false
        this.readyCallbacks = []
        this.setupCallbacks = []

        this.client.on("ready", this.onReady.bind(this))
        this.client.on("message", this.onMessage.bind(this))

        this.client.login(this.config.discordToken)
    }

    get id() {
        return this.client.user.id
    }

    get name() {
        return this.client.user.username
    }

    get discriminator() {
        return this.client.user.discriminator
    }

    get isReady() {
        return this._isReady
    }

    get servers() {
        return this.client.guilds.array()
    }

    user(id) {
        return this.client.users.get(id)
    }

    db(handle) {
        if(!handle) {
            console.error("handle was null?", handle)
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
            console.error("Unknown handle, can't create db from it: ", handle)
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
                    console.error(err)
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
                    console.error(ex)
                    reject(ex)
                }
            })
        })
    }

    hash(str) {
        const sha = crypto.createHash("sha256")
        sha.update(str)
        return sha.digest("hex")
    }

    request(args) {
        return request.apply(null, arguments)
    }

    onReady() {
        console.log(`${this.name}#${this.discriminator} is ready.`)

        if(!this._isSetup) {
            this._isReady = true

            if(this.config.useBuiltinActions) {
                this.registerBuiltinActions()
            }

            if(this.config.loadModules) {
                this.moduleManager.register(this)
            }

            for(let setupCallback of this.setupCallbacks) {
                setupCallback()
            }

            this.intervalId = setInterval(this.onInterval.bind(this), this.config.intervalInSeconds * 1000)
            this.onInterval()

            this._isSetup = true
        }

        // ready callbacks should be called on every ready event from discord, which is why this
        // is not part of the if statement above
        for(let readyCallback of this.readyCallbacks) {
            readyCallback()
        }
    }

    onInterval() {
        for(let ident of Object.keys(this.intervalActions)) {
            try {
                this.intervalActions[ident]()
            } catch(ex) {
                console.error(`ERR: Interval "${ident}" failed`, ex)
            }
        }
    }

    interval(ident, func) {
        console.log("\tregistered interval action " + ident)
        this.intervalActions[ident] = func
    }

    clearInterval(ident) {
        console.log("\t- unregistered interval action " + ident)
        if(this.intervalActions[ident])
            delete this.intervalActions[ident]
    }

    message(func) {
        console.log("\tregistered message observer")
        this.messageObservers.push(func)
    }

    ready(callback) {
        this.readyCallbacks.push(callback)
    }

    setup(callback) {
        this.setupCallbacks.push(callback)
    }

    onMessage(message) {
        let isBotString = message.author.bot ? "[BOT] " : ""
        console.log(`${isBotString}${message.author.username}#${message.author.discriminator} (${message.author.id}): ${message.content}`)

        // don't listen to yourself
        if(message.author.id !== this.client.user.id && !message.author.bot) {
            this.actions.update(message)

            try {
                this.messageObservers.every(obs => obs(message))
            } catch(ex) {
                console.error(`ERR: Message listener for message "${message.content}" failed`, ex)
            }
        }
    }

    sendMessageToChannel(channel, message) {
        let promise = channel.send(message)

        promise.then(message => {
            // TODO: only show this when debugging
            // console.log("Sent message: ", message.cleanContent)
        }).catch(err => {
            console.error(err)
        })

        return promise
    }

    isAdministrator(user) {
        return this.config.administrators.indexOf(user.id) > -1
    }

    isServerAdministrator(server, user) {
        if(this.config.botAdminRightsAlsoApplyInServers && this.isAdministrator(user)) {
            return true
        }

        return this.hasPermission(server, user, "ADMINISTRATOR")
    }

    hasPermission(server, user, permissions) {
        if(!server || !user) {
            return false
        }

        if(!Array.isArray(permissions)) {
            permissions = [permissions]
        }

        let serverUser = server.members.get(user.id)
        return serverUser.hasPermissions(permissions)
    }

    canI(server, permissions) {
        return this.hasPermission(server, this.client.user, permissions)
    }

    command(commandName, callback) {
        if(!this.isReady) {
            console.warn("WARN: Discord is not yet ready, please wait a moment before you register any commands")
            return
        }

        console.log(`\tregistered command action: "${commandName}"`)

        this.actions.register(new RegExp(`^!${commandName}\s?(.*)`), (res) => {
            let args = res.matches[1].trim().split(" ")

            // special case for when there are no args, cuz split leaves an empty string
            if(args.length == 1 && args[0].length == 0) {
                args = []
            }

            callback(res, args)
        })
    }

    hear(regex, callback) {
        if(!this.isReady) {
            console.warn("WARN: Discord is not yet ready, please wait a moment before you register any commands")
            return
        }

        console.log(`\tregistered hear action: "${regex.source}"`)

        this.actions.register(regex, (res) => {
            callback(res)
        })
    }

    respond(regex, callback) {
        if(!this.isReady) {
            console.warn("WARN: Discord is not yet ready, please wait a moment before you register any commands")
            return
        }

        console.log(`\tregistered respond action: "${regex.source}"`)

        let prefix = new RegExp(`<@${this.client.user.id}> `)
        this.actions.register(new RegExp(prefix.source + regex.source), (res) => {
            callback(res)
        })
    }

    registerBuiltinActions() {
        console.log("Register builtin actions:")

        this.respond(/ping/g, res => {
            res.reply("PONG")
        })

        this.respond(/(who am i|whoami)/g, res => {
            res.sendEmbed("Here is the information you've requested.", embed => {
                let author = res.message.author

                embed.addField(`ID`, `${author.id}`)
                embed.addField(`Username`, `${author.username}#${author.discriminator}`)
                embed.addField(`Created at`, `${author.createdAt.toISOString().slice(0, 10)}`)
                embed.setImage(author.avatarURL)
            })
        })

        this.respond(/am i admin/g, res => {
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

        this.command("botlink", (res, args) => {
            if(res.authorIsAdministrator) {
                res.sendDirectMessage(`You can add me to servers by using this URL:\n\n` +
                    `https://discordapp.com/api/oauth2/authorize?client_id=${this.client.user.id}&scope=bot&permissions=0`)
                res.send(":ok_hand:")
            } else {
                res.send(":thumbsdown:")
            }
        })

        this.command("setusername", (res, args) => {
            if(res.authorIsAdministrator) {
                let newUsername = args.join(" ")
                this.client.user.setUsername(newUsername)
                res.reply("I've changed my username to " + newUsername)
            } else {
                res.reply("You don't have permission to do this.")
            }
        })

        this.command("setavatar", (res, args) => {
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

        this.command("hcf", (res, args) => {
            if(res.authorIsAdministrator) {
                res.reply("Aye, sir! I will proceed to kill myself.").then(_ => process.exit(0))
            } else {
                res.reply("You don't have the permission to initiate the self destruct protocol v2.1...")
            }
        })

        this.command("prune", (res, args) => {
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
                                console.error(err.response.body.message)
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
