const Response = require("./Response.js")

class ActionParser {
    constructor(bot) {
        this.bot = bot

        this.actions = []
    }

    register(regex, callback) {
        this.actions.push({
            trigger: regex,
            callback: callback
        })
    }

    update(message) {
        for(let action of this.actions) {
            let match = message.content.match(action.trigger)

            if(match) {
                try {
                    action.callback(new Response(this.bot, message, match))
                } catch(ex) {
                    console.error(`ERR: Action for message "${message.content}" failed`, ex)
                }
            }
        }
    }
}

module.exports = ActionParser
