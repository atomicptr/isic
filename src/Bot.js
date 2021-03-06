const EventEmitter = require("events")

const DiscordHandler = require("./DiscordHandler")
const ModuleManager = require("./ModuleManager")
const Module = require("./Module")
const DatabaseProvider = require("./DatabaseProvider")

const crypto = require("crypto")
const request = require("request")
const express = require("express")
const bodyParser = require("body-parser")
const uuid = require("uuid/v4")
const fs = require("fs")
const path = require("path")

const utils = require("./utils")

class Bot extends EventEmitter {
    constructor(config) {
        super()

        if(!config || !config.token) {
            throw "No Discord bot token found."
        }

        const defaultSettings = {
            interval: 300,
            management: {
                administrators: [],
                admin_rights_apply_in_server: false
            },
            services: {
                enabled: false,
                port: 8080,
                baseurl: "http://example.com",
                webui: false
            },
            modules: {
                paths: [],
                load: true,
                builtins: true
            },
            database: {
                host: "localhost",
                port: 27017,
                database_name: "isic",
                username: null,
                password: null,
                options: null
            }
        }

        this.config = utils.assign({}, defaultSettings, config)

        this._database = new DatabaseProvider(this, this.config.database, _ => {
            this.client = new DiscordHandler(this, this.config.token)

            this.moduleManager = new ModuleManager(this)
            this.builtins = null

            this.isSetup = false

            if(this.config.services.enabled) {
                this._eapp = express()

                this._eapp.use(bodyParser.json())

                this._eapp.listen(this.config.services.port, _ => {
                    this.log.info(`services enabled and running on port: ${this.config.services.port}...`)
                    this.client.on("ready", this.onReady.bind(this))
                })
            } else {
                this.log.info("services disabled")
                this.client.on("ready", this.onReady.bind(this))
            }
        })
    }

    get discord() {
        return this.client
    }

    get clientUser() {
        return this.client.user
    }

    get database() {
        return this._database
    }

    // should only be called from bot internals
    get log() {
        return {
            // TODO: add a logger here
            info: (...message) => this.contextLog.info({from: "internals"}, ...message),
            debug: (...message) => this.contextLog.debug({from: "internals"}, ...message),
            error: (...message) => this.contextLog.error({from: "internals"}, ...message),
            warn: (...message) => this.contextLog.warn({from: "internals"}, ...message)
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
            // register builtins
            if(this.config.modules.builtins) {
                this.builtins = this.moduleManager.registerModule(
                    {identifier: "builtins"}, require("./BuiltinModules.js"))
            }

            // load modules from paths
            if(this.config.modules.load) {
                console.log(this.config.modules)
                for(let modulePath of this.config.modules.paths) {
                    this.moduleManager.loadModulesFromDirectory(modulePath)
                }
            }

            this.client.on("message", this.onMessage.bind(this))

            this.intervalId = setInterval(() => this.emit("interval"), this.config.interval * 1000)

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

    get service() {
        return {
            get: (path, callback) => this.builtins.service.get(path, callback),
            post: (path, callback) => this.builtins.service.post(path, callback),
            put: (path, callback) => this.builtins.service.put(path, callback),
            delete: (path, callback) => this.builtins.service.delete(path, callback)
        }
    }

    hash(str) {
        const sha = crypto.createHash("sha256")
        sha.update(str)
        return sha.digest("hex")
    }

    request(args) {
        return request.apply(null, arguments)
    }

    collection(collectionName, serverId) {
        return this.bot.database.collection(this.builtins, collectionName, serverId)
    }

    collectionName(collectionName, serverId) {
        return this.bot.database.collection(this.builtins, collectionName, serverId)
    }

    eachCollection(collectionName, callback) {
        return this.bot.database.eachCollection(this.builtins, collectionName, callback)
    }

    uuid(input) {
        if(!input) return uuid()
        return uuid(input)
    }

    registerService(method, mod, path, callback) {
        if(!this.config.services.enabled) {
            this.log.debug(`trying to register service endpoint, but services are disabled for ${mod.identifier}::${ident}`)
            return
        }

        let urlpath = ["service"]

        if(mod.identifier !== "builtins") {
            urlpath.push(mod.identifier)
        }

        urlpath = urlpath.concat(path.split("/").filter(part => part.length > 0))

        const urlString = urlpath.join("/")

        this.log.debug(`registered service endpoint ${method.toUpperCase()} /${urlString}`)
        this._eapp[method.toLowerCase()](`/${urlString}`, callback)
    }
}

module.exports = Bot
