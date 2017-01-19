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

    send(message) {
        this.message.channel.send(message).then(message => {
            // TODO: only show this when debugging
            console.log("Sent message: ", message.cleanContent)
        }).catch(err => {
            console.error(err)
        })
    }

    reply(message) {
        this.send(`<@${this.authorId}> ${message}`)
    }
}

module.exports = Response
