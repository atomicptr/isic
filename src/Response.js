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

    get matches() {
        return this._matches
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

    send(message) {
        return this.sendMessageToChannel(this.message.channel, message)
    }

    reply(message) {
        return this.send(`<@${this.authorId}> ${message}`)
    }

    sendDirectMessage(message) {
        return this.bot.user(this.authorId).sendMessage(message)
    }
}

module.exports = Response
