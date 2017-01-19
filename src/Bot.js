const ActionParser = require("./ActionParser")
const ModuleManager = require("./ModuleManager.js")

const Discord = require("discord.js")

class Bot {
    constructor(config) {
        this.client = new Discord.Client()

        this.config = config

        if(config.loadModules) {
            this.moduleManager = new ModuleManager(config.modulePaths)
        } else {
            console.warn("WARN: You've disabled the ability to load modules.")
        }

        this.actions = new ActionParser(this)

        this._isReady = false
        this.readyCallbacks = []

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

    user(id) {
        return this.client.users.get(id)
    }

    onReady() {
        console.log(`${this.name}#${this.discriminator} is ready.`)

        this._isReady = true

        if(this.config.useBuiltinActions) {
            this.registerBuiltinActions()
        }

        if(this.config.loadModules) {
            this.moduleManager.register(this)
        }

        for(let readyCallback of this.readyCallbacks) {
            readyCallback()
        }
    }

    ready(callback) {
        this.readyCallbacks.push(callback)
    }

    onMessage(message) {
        let isBotString = message.author.bot ? "[BOT] " : ""
        console.log(`${isBotString}${message.author.username}#${message.author.discriminator} (${message.author.id}): ${message.content}`)

        // don't listen to yourself
        if(message.author.id !== this.client.user.id && !message.author.bot) {
            this.actions.update(message)
        }
    }

    sendMessageToChannel(channel, message) {
        let promise = channel.send(message)

        promise.then(message => {
            // TODO: only show this when debugging
            console.log("Sent message: ", message.cleanContent)
        }).catch(err => {
            console.error(err)
        })

        return promise
    }

    isAdministrator(user) {
        return this.config.administrators.indexOf(user.id) > -1
    }

    isServerAdministrator(server, user) {
        if(this.config.botAdminRightsAlsoApplyInChannels && this.isAdministrator(user)) {
            return true
        }

        return this.hasPermission(server, user, "ADMINISTRATOR")
    }

    hasPermission(server, user, permission) {
        return this.hasPermissions(server, user, [permission])
    }

    hasPermissions(server, user, permissionArray) {
        let serverUser = server.members.get(user.id)
        return serverUser.hasPermissions(permissionArray)
    }

    command(commandName, callback) {
        if(!this.isReady) {
            console.warn("WARN: ISIC is not yet ready, please wait a moment before you register any commands")
            return
        }

        console.log(`\tregistered command action: "${commandName}"`)

        this.actions.register(new RegExp(`!${commandName}\s?(.*)`), (res) => {
            let args = res.matches[1].trim().split(" ")
            callback(res, args)
        })
    }

    hear(regex, callback) {
        if(!this.isReady) {
            console.warn("WARN: ISIC is not yet ready, please wait a moment before you register any commands")
            return
        }

        console.log(`\tregistered hear action: "${regex.source}"`)

        this.actions.register(regex, (res) => {
            callback(res)
        })
    }

    respond(regex, callback) {
        if(!this.isReady) {
            console.warn("WARN: ISIC is not yet ready, please wait a moment before you register any commands")
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
            let author = res.message.author

            res.reply(`\nID: ${author.id}\n` +
                `Username: ${author.username}#${author.discriminator}\n` +
                `Created at: ${author.createdAt.toISOString().slice(0, 10)}\n` +
                `Avatar:\n${author.avatarURL}`
            )
        })

        this.respond(/am i admin/g, res => {
            let isServerAdmin = false

            if(res.message.guild) {
                isServerAdmin = this.isServerAdministrator(res.server, res.author)
            }

            let isBotAdmin = this.isAdministrator(res.author)

            if(isBotAdmin && isServerAdmin) {
                res.reply("Yes, master.")
            } else if(isBotAdmin && !isServerAdmin) {
                res.reply("Yes you are my master, but I can't help you on this server :'(")
            } else if(isServerAdmin) {
                res.reply("Yes you have Administrator rights on this server.")
            } else {
                res.reply("No.")
            }
        })

        this.command("setusername", (res, args) => {
            if(this.isAdministrator(res.author)) {
                let newUsername = args.join(" ")
                this.client.user.setUsername(newUsername)
                res.reply("I've changed my username to " + newUsername)
            } else {
                res.reply("You don't have permission to do this.")
            }
        })

        this.command("setavatar", (res, args) => {
            if(this.isAdministrator(res.author)) {
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
    }
}

module.exports = Bot
