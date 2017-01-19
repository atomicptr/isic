class Response {
    constructor(bot, message, matches) {
        this._bot = bot
        this._message = message
        this._matches = matches
    }

    get bot() {
        return this._bot
    }

    get message() {
        return this._message
    }

    get authorId() {
        return this._message.author.id
    }

    get author() {
        return this._message.author
    }

    get server() {
        return this._message.guild
    }

    get matches() {
        return this._matches
    }

    send(message) {
        return this.bot.sendMessageToChannel(this.message.channel, message)
    }

    reply(message) {
        return this.send(`<@${this.authorId}> ${message}`)
    }

    sendDirectMessage(message) {
        return this.bot.user(this.authorId).sendMessage(message)
    }
}

module.exports = Response
