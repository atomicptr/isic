const fs = require("fs")
const path = require("path")

class ModuleManager {
    constructor(modulePath) {
        if(!Array.isArray(modulePath)) {
            modulePath = [modulePath]
        }

        this.modulePaths = modulePath.map(p => path.resolve(process.cwd(), p))

        console.log(`Trying to read modules at: ${this.modulePaths.join(", ")}`)

        this.modules = {}

        for(let modulePath of this.modulePaths) {
            this.loadModulesFromDirectory(modulePath)
        }
    }

    loadModulesFromDirectory(modulePath) {
        if(!fs.existsSync(modulePath)) {
            console.error(`ERR: Module path: ${modulePath} does not exist...`)
            return
        }

        fs.readdir(modulePath, (err, dirs) => {

            for(let mod of dirs) {
                let modPath = path.resolve(modulePath, mod)

                let modFilePath = path.resolve(modPath, "module.json")
                let exists = fs.existsSync(modFilePath)

                if(exists) {
                    let modFile = require(modFilePath)
                    console.log(`Loading module... ${modPath}`)

                    if(modFile.ident && modFile.name && modFile.main) {
                        if(Object.keys(this.modules).indexOf(modFile.ident) > 0) {
                            console.error(`ERR: There is already a mod with the ident: ${modFile.ident}, ignore ${modPath}`)
                        } else {
                            this.modules[modFile.ident] = modFile
                            this.modules[modFile.ident].__module_path = modPath
                            console.log(`\tAdded module named: "${modFile.name}" (${modFile.ident})`)
                        }
                    } else {
                        console.error(`ERR: Module ${modPath} doesn't seem to be a valid module, the module.json file must contain the keys: name, ident and main`)
                    }
                }
            }
        })
    }

    register(bot) {
        if(Object.keys(this.modules).length == 0) {
            console.log("No modules found.")
            return
        }

        console.log(`Trying to register actions from my ${Object.keys(this.modules).length} known modules`)

        for(let moduleIdent of Object.keys(this.modules)) {
            let module = this.modules[moduleIdent]

            console.log(`module ${moduleIdent}:`)

            try {
                require(path.resolve(module.__module_path, module.main))(bot)
            } catch(ex) {
                console.error(`ERR: Could not register module "${moduleIdent}" in ${module.__module_path}"`, ex)
            }
        }
    }
}

module.exports = ModuleManager
