module.exports = function(mod) {
    mod.debug("Register builtin actions:")

    mod.respond(/ping/g, res => {
        res.reply("PONG")
    })

    mod.respond(/(who am i|whoami)/g, res => {
        res.sendEmbed("Here is the information you've requested.", embed => {
            let author = res.message.author

            embed.addField(`ID`, `${author.id}`)
            embed.addField(`Username`, `${author.username}#${author.discriminator}`)
            embed.addField(`Created at`, `${author.createdAt.toISOString().slice(0, 10)}`)
            embed.setImage(author.avatarURL)
        })
    })

    mod.respond(/am i admin/g, res => {
        if(res.authorIsAdministrator && res.authorIsServerAdministrator) {
            res.reply("Yes, master.")
        } else if(res.authorIsAdministrator && !res.authorIsServerAdministrator) {
            res.reply("Yes you are my master, but I can't help you on this server :'(")
        } else if(res.authorIsServerAdministrator) {
            res.reply("Yes you have Administrator rights on this server.")
        } else {
            res.reply("No.")
        }
    })

    mod.command("botlink", (res, args) => {
        if(res.authorIsAdministrator) {
            res.sendDirectMessage(`You can add me to servers by using this URL:\n\n` +
                `https://discordapp.com/api/oauth2/authorize?client_id=${mod.client.user.id}&scope=bot&permissions=0`)
            res.send(":ok_hand:")
        } else {
            res.send(":thumbsdown:")
        }
    })

    mod.command("setusername", (res, args) => {
        if(res.authorIsAdministrator) {
            let newUsername = args.join(" ")
            mod.client.user.setUsername(newUsername)
            res.reply("I've changed my username to " + newUsername)
        } else {
            res.reply("You don't have permission to do mod.")
        }
    })

    mod.command("setavatar", (res, args) => {
        if(res.authorIsAdministrator) {
            const request = require("request").defaults({ encoding: null })

            let url = args[0]

            request.get(url, (err, response, body) => {
                if(!err && response.statusCode == 200) {
                    const data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString("base64")
                    mod.client.user.setAvatar(data)
                    res.reply("I've changed my avatar to <" + url + ">, does it suit me? :)")
                } else {
                    res.reply("I was not able to change my avatar to <" + url + "> :(")
                }
            })
        } else {
            res.reply("You don't have permission to do this, scrub.")
        }
    })

    mod.command("hcf", (res, args) => {
        if(res.authorIsAdministrator) {
            res.reply("Aye, sir! I will proceed to kill myself.").then(_ => process.exit(0))
        } else {
            res.reply("You don't have the permission to initiate the self destruct protocol v2.1...")
        }
    })

    mod.command("prune", (res, args) => {
        if(res.authorIsServerAdministrator) {
            if(args.length > 0) {
                if(!isNaN(args[0])) {
                    if(res.canI("MANAGE_MESSAGES")) {
                        // +1 since you also want to get rid of the message saying "!prune 2"
                        res.message.channel.bulkDelete(Number(args[0]) + 1).then(messages => {
                            res.send(`Deleted ${messages.array().length - 1} messages and added this one! :wastebasket:`).then(message => {
                                message.delete(5000) // delete this message after 5s
                            })
                        }).catch(err => {
                            mod.error(err.response.body.message)
                            res.send(err.response.body.message)
                        })
                    } else {
                        res.send("I'd love to clean up your mess, but I don't have the permission to manage messages... :angry:")
                    }
                } else {
                    res.send("What is this \"" + args[0] + "\", doesn't look like a number for me :(")
                }
            } else {
                res.reply("I appreciate the idea of me cleaning this room but you could at least tell me how much you want me to delete :P")
            }
        } else {
            res.reply("You don't have the permission to do this mate...")
        }
    })

    mod.command("debug:interval", (res, args) => {
        res.send("Emitting interval event...")
        mod.bot.emit("interval")
    })
}
