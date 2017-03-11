// WHY?: This module primarly exists to test databases on different servers, users etc.

module.exports = function(bot) {
    function plus1(res) {
        let collection = bot.collection("counter")

        collection.findOne({owner: res.contextId}).then(obj => {
            if(!obj) {
                collection.insert({owner: res.contextId, num: 0})
                plus1(res)
                return
            }

            let owner = obj.owner
            let num = obj.num

            res.send(`I don't know what you're counting but it's at ${++num} now`).then(message => {
                collection.update({owner: obj.owner}, {owner, num})
            })
        })


    }

    bot.hear(/(?:\s|^)\+1(?=\s|$)/g, res => plus1(res))
    bot.hear(/👍/g, res => {
        if(res.canI("ADD_REACTIONS")) {
            res.message.react("👍")
        }
    })
}
