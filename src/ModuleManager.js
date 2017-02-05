const fs = require("fs")
const path = require("path")

const Module = require("./Module")

class ModuleManager {
    constructor(bot) {
        this.bot = bot
        this.modules = {}
    }

    registerModule(modConfig, registerFunction) {
        if(!(modConfig.identifier || modConfig.ident)) {
            this.bot.log.error("A module MUST have an identifier...")
            return
        }

        if(!modConfig.identifier && modConfig.ident) {
            modConfig.identifier = modConfig.ident
        }

        if(!registerFunction) {
            registerFunction = function() {}
        }

        if(!this.modules[modConfig.identifier]) {
            this.modules[modConfig.identifier] = new Module(this.bot, modConfig, registerFunction)
        } else {
            this.bot.log.error(`Failed to add a module with the identifier ${modConfig.identifier}. A module with this identifier already exists...`)
        }
    }

    loadModulesFromDirectory(modulePath) {
        if(!fs.existsSync(modulePath)) {
            this.bot.log.error(`Failed to load modules from directory ${modulePath}, because it does not exist...`)
            return
        }

        let dirs = fs.readdirSync(modulePath)

        this.bot.log.info(`Scanning "${path.resolve(process.cwd(), modulePath)}" for modules...`)

        for(let mod of dirs) {
            let modPath = path.resolve(modulePath, mod)

            let modFilePath = path.resolve(modPath, "module.json")
            let exists = fs.existsSync(modFilePath)

            if(exists) {
                let modFile = require(modFilePath)

                if((modFile.identifier || modFile.ident) && modFile.main) {
                    this.bot.log.info(`Module ${modPath} found.`)

                    let registerFunc = require(path.resolve(modPath, modFile.main))

                    this.registerModule(modFile, registerFunc)
                } else {
                    this.bot.log.warn(`The module at ${modPath} does't seem to be a valid module, the module.json file must contain an "identifier" and a "main" file.`)
                }
            }
        }
    }

    onMessage(message) {
        for(let identifier of Object.keys(this.modules)) {
            this.modules[identifier].update(message)
        }
    }
}

module.exports = ModuleManager
