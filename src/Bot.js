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
                    {identifier: "builtins"}, require("./BuiltinModules.js"))
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
}

module.exports = Bot
