// WHY?: This module primarly exists to test databases on different servers, users etc.

module.exports = function(bot) {
    function plus1(res) {
        res.db.defaults({counter: 0}).value()
        let counter = bot.db(res).get("counter").value()

        res.send(`I don't know what you're counting but it's at ${++counter} now`).then(message => {
            res.db.set("counter", counter).value()
        })
    }

    bot.hear(/\+1/g, res => plus1(res))
    bot.hear(/👍/g, res => plus1(res))
}
