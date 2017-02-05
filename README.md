# isic

A modular [Discord](https://discordapp.com/) bot.

## Usage

You can either clone this directory and run the bot via ```npm start``` or install the **isic** package via ```npm install isic```.

### Use isic as a package

You can use isic as a npm package:

```javascript
const {Bot} = require("isic")

let bot = new Bot({discordToken: "YOUR_DISCORD_TOKEN"})

// after bot is ready
bot.on("setup", () => {

    // add your own commands
    bot.command("test", (res, args) => {
        res.send("This is a test!")
    })
})

```

## Module structure

Your module directory should look like this:

    modules/
        helloworld/
            module.json
            helloworld.js

Example for ```module.json```:

```json
{
    "ident": "github.atomicptr.HelloWorld",
    "main": "helloworld.js"
}
```

Example for ```helloworld.js```:

```js
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
```

## License

MIT
