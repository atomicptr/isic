module.exports = function(bot) {

    bot.command("hello", (res, args) => {
        let name = "World"

        if(args.length > 0) {
            name = args.join(" ")
        }

        res.reply(`Hello, ${name}!`).then(message => {
            if(bot.canI(res.server, "ADD_REACTIONS")) {
                message.react("😁")
            }
        })
    })
}
