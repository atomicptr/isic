module.exports = function(bot) {

    bot.command("hello", (res, args) => {
        let name = "World"

        if(args.length > 0) {
            name = args.join(" ")
        }

        res.reply(`Hello, ${name}!`).then(message => {
            if(res.canI("ADD_REACTIONS")) {
                message.react("😁")
            }
        })
    })
}
