const Response = require("./Response")

class IntervalResponse extends Response {
    constructor(bot, mod) {
        super(bot, mod, null, null)
    }

    intervalResponseWrongUsageError() {
        this.bot.error("IntervalResponses are very limited since they don't have and associated Message, you shouldn't use this method at all!")
        return null
    }

    // things from response that shouldn't work
    get authorId() {
        return this.intervalResponseWrongUsageError()
    }

    get author() {
        return this.intervalResponseWrongUsageError()
    }

    get serverId() {
        return this.intervalResponseWrongUsageError()
    }

    get server() {
        return this.intervalResponseWrongUsageError()
    }

    get channelId() {
        return this.intervalResponseWrongUsageError()
    }

    get channel() {
        return this.intervalResponseWrongUsageError()
    }

    get contextId() {
        return this.intervalResponseWrongUsageError()
    }

    get autoId() {
        return this.intervalResponseWrongUsageError()
    }

    send(message) {
        return this.intervalResponseWrongUsageError()
    }

    reply(message) {
        return this.intervalResponseWrongUsageError()
    }

    random(messages) {
        return this.intervalResponseWrongUsageError()
    }

    sendDirectMessage(message) {
        return this.intervalResponseWrongUsageError()
    }

    sendEmbed(message, callback) {
        return this.intervalResponseWrongUsageError()
    }

    get authorIsAdministrator() {
        return this.intervalResponseWrongUsageError()
    }

    get authorIsServerAdministrator() {
        return this.intervalResponseWrongUsageError()
    }

    canI(permissions) {
        return this.intervalResponseWrongUsageError()
    }

    authorHasPermission(permissions) {
        return this.intervalResponseWrongUsageError()
    }

    serverEmoji(name, altText) {
        return this.intervalResponseWrongUsageError()
    }

    collection(collectionName) {
        return this.intervalResponseWrongUsageError()
    }
}

module.exports = IntervalResponse
