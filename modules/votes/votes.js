module.exports = function(bot) {
    bot.command("vote", (res, args) => {
        if(res.canI(["ADD_REACTIONS", "MANAGE_MESSAGES"])) {
            if(!res.authorIsServerAdministrator || !res.authorHasPermission(["MANAGE_MESSAGES"])) {
                res.send("You don't have permission to create votes. You'd need to be able to manage messages to do that.")
                return
            }

            let text = args.join(" ")

            res.collection("channels").findOne({channelId: res.channelId}).then(vote => {
                if(vote) {
                    // a vote is already happening in this channel, end it in the future? TODO
                    res.send("There is already a vote running in this channel, you can end it with !endvote.")
                    return
                }

                res.send("**Now voting on**: " + text).then(message => {
                    message.react("✅").then(_ => message.react("❌").then(_ => message.pin()))

                    res.collection("channels").insert({channelId: res.channelId, messageId: message.id, text: text})
                })
            })
        } else {
            res.send("I can't create votes without having ADD_REACTIONS and MANAGE_MESSAGES permissions.")
        }
    })

    bot.command("endvote", (res, args) => {
        if(res.canI(["ADD_REACTIONS", "MANAGE_MESSAGES"])) {
            res.collection("channels").findOne({channelId: res.channelId}).then(vote => {
                if(!vote) {
                    res.send("There is no vote at the moment.")
                    return
                }

                res.channel.fetchMessage(vote.messageId).then(message => {
                    if(!res.authorIsServerAdministrator || res.author.id === message.author.id) {
                        res.send("You don't have permission to end votes. You have to be either the person who started it or an administrator.")
                        return
                    }

                    let reactions = message.reactions.array()

                    reactions = reactions.filter(m => m._emoji.name === "✅" || m._emoji.name === "❌")

                    let options = reactions.map(reaction => `* ${reaction._emoji.name} with ${reaction.count - 1} votes`)

                    res.send(`**End vote**: ${vote.text}\n\n${options.join("\n")}`).then(_ => {
                        message.unpin()

                        res.collection("channels").remove({channelId: res.channelId})
                    })
                })
            })
        } else {
            res.send("I can't stop votes without having ADD_REACTIONS and MANAGE_MESSAGES permissions.")
        }
    })
}
