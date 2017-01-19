module.exports = function(bot) {

    bot.registerCommand("ping", function(arguments) {
        bot.send("pong")
    })
}
