const {MongoClient} = require("mongodb")

class DatabaseProvider {
    constructor(bot, settings) {
        this.bot = bot
        this.settings = settings

        let authstr = ""

        if(settings.username && settings.password) {
            authstr = `${settings.username}:${settings.password}@`
        }

        let optionsstr = ""

        if(settings.options) {
            let options = []

            for(let option of Object.keys(settings.options)) {
                options.push({key: option, val: settings.options[option]})
            }

            if(options.length > 0) {
                const strings = options.map(o => `${o.key}=${o.val}`)
                optionsstr = `?${strings.join("&")}`
            }
        }

        const url = `mongodb://${authstr}${settings.host}:${settings.port}/${settings.database_name}${optionsstr}`

        this.db = null

        bot.on("setup", this.onSetup.bind(this, url))
    }

    onSetup(url) {
        let printurl = url.replace(`${this.settings.username}:${this.settings.password}@`, `${this.settings.username}:**********@`)
        this.bot.log.debug(`trying to connect with database: ${printurl}`)

        MongoClient.connect(url).then(db => {
            this.db = db
        }).catch(err => {
            this.bot.log.error(err)
            process.exit(1)
        })
    }

    collection(mod, collectionName, serverId) {
        return this.db.collection(this.collectionName(mod, collectionName, serverId))
    }

    collectionName(mod, collectionName, serverId) {
        const isGlobal = typeof serverId === "undefined"
        return `${isGlobal ? "global" : serverId}::${mod.identifier}::${collectionName}`
    }
}

module.exports = DatabaseProvider
