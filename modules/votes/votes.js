module.exports = function(bot) {
    bot.command("vote", (res, args) => {
        if(bot.canI(res.server, ["ADD_REACTIONS", "MANAGE_MESSAGES"])) {
            if(!bot.isServerAdministrator(res.server, res.author) || !bot.hasPermission(res.server, res.author, ["MANAGE_MESSAGES"])) {
                res.send("You don't have permission to create votes. You'd need to be able to manage messages to do that.")
                return
            }

            let text = args.join(" ")

            bot.db(res.server).defaults({isicVotingChannels: {}}).value()

            let votes = bot.db(res.server).get("isicVotingChannels").value()

            const vote = votes[res.channelId]

            if(vote) {
                // a vote is already happening in this channel, end it in the future? TODO
                res.send("There is already a vote running in this channel, you can end it with !endvote.")
                return
            }

            res.send("**Now voting on**: " + text).then(message => {
                message.react("✅").then(_ => message.react("❌").then(_ => message.pin()))

                bot.db(res.server).set(`isicVotingChannels.${res.channelId}`, {messageId: message.id, text: text}).value()
            })
        } else {
            res.send("I can't create votes without having ADD_REACTIONS and MANAGE_MESSAGES permissions.")
        }
    })

    bot.command("endvote", (res, args) => {
        if(bot.canI(res.server, ["ADD_REACTIONS", "MANAGE_MESSAGES"])) {
            bot.db(res.server).defaults({isicVotingChannels: {}}).value()

            let votes = bot.db(res.server).get("isicVotingChannels").value()

            const vote = votes[res.channelId]

            if(!vote) {
                // a vote is already happening in this channel, end it in the future? TODO
                res.send("There is no vote at the moment.")
                return
            }

            res.channel.fetchMessage(vote.messageId).then(message => {
                if(!bot.isServerAdministrator(res.server, res.author) || res.author.id === message.author.id) {
                    res.send("You don't have permission to end votes. You have to be either the person who started it or an administrator.")
                    return
                }

                let reactions = message.reactions.array()

                reactions = reactions.filter(m => m._emoji.name === "✅" || m._emoji.name === "❌")

                let options = reactions.map(reaction => `* ${reaction._emoji.name} with ${reaction.count - 1} votes`)

                res.send(`**End vote**: ${vote.text}\n\n${options.join("\n")}`).then(_ => {
                    message.unpin()

                    let state = bot.db(res.server).getState()
                    delete state.isicVotingChannels[res.channelId]
                    bot.db(res.server).setState(state)
                })
            })
        } else {
            res.send("I can't stop votes without having ADD_REACTIONS and MANAGE_MESSAGES permissions.")
        }
    })
}
