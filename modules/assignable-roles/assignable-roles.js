module.exports = function(bot) {

    function addRole(res, args) {
        if(args.length != 1) {
            showHelp(res)
            return
        }

        let roleName = args[0]

        let roles = res.db.get("selfAssignableRoles").value()

        if(roles.indexOf(roleName) > -1) {
            let user = res.server.members.get(res.authorId)

            let role = res.server.roles.filterArray(r => r.name === roleName)

            user.addRoles(role)

            res.reply(`You are now assigned to the role: **${roleName}** :clap:`)
        } else {
            res.reply(`The role **${roleName}** either doesn't exist or is not made self assignable yet, ask one of the server administrators about it.`)
        }
    }

    function removeRole(res, args) {
        if(args.length != 1) {
            showHelp(res)
            return
        }

        let roleName = args[0]

        let roles = res.db.get("selfAssignableRoles").value()

        if(roles.indexOf(roleName) > -1) {
            let user = res.server.members.get(res.authorId)

            let role = res.server.roles.filterArray(r => r.name === roleName)

            user.removeRoles(role)

            res.reply(`You are no longer assigned to the role: **${roleName}** :clap:`)
        } else {
            res.reply(`The role **${roleName}** either doesn't exist or is not made self assignable yet, ask one of the server administrators about it.`)
        }
    }

    function listRoles(res) {
        const roles = res.db.get("selfAssignableRoles").value()
        let rolesStr = roles.map(r => `* ${r}`)

        if(roles.length > 0) {
            res.reply("Available roles to self assign:\n" + rolesStr.join("\n"))
        } else {
            res.reply("There are no assignable roles yet, ask one of the server admins to add some.")
        }
    }

    function makeRoleAssignable(res, args) {
        if(!res.authorHasPermission("MANAGE_ROLES_OR_PERMISSIONS")) {
            res.reply("You don't have the permission to do this")
            showHelp(res)
            return
        }

        if(args.length != 1) {
            showHelp(res)
            return
        }

        let roleName = args[0]

        let rolesdb = res.db.get("selfAssignableRoles")
        let availableRoles = res.server.roles.filterArray(r => r.mentionable).map(r => r.name)

        if(availableRoles.indexOf(roleName) > -1) {
            rolesdb.push(roleName).value()

            res.reply(`Made **${roleName}** to a self assignable role!`)
        } else {
            res.reply(`Unknown role name: **${roleName}**, the only available roles are: ${availableRoles.join(", ")}.\n` +
                `Please note that a role must be mentionable in order for me to make them self assignable.`)
        }
    }

    function showHelp(res) {
        let roleAssignableString = res.authorHasPermission("MANAGE_ROLES_OR_PERMISSIONS") ? "\n!role assignable **ROLE_NAME**" : ""
        res.reply("Use the command like this:\n!role add **ROLE_NAME**\n!role remove **ROLE_NAME**\n!role list" +
            roleAssignableString + "\n\nPlease note that only mentionable roles are self assignable")
    }

    bot.command("role", (res, args) => {
        if(res.canI("MANAGE_ROLES_OR_PERMISSIONS")) {
            res.db.defaults({ selfAssignableRoles: [] }).value()

            if(args.length > 0) {
                switch(args[0]) {
                    case "add":
                        addRole(res, args.slice(1, args.length))
                        break
                    case "remove":
                        removeRole(res, args.slice(1, args.length))
                        break
                    case "list":
                        listRoles(res)
                        break
                    case "assignable":
                        makeRoleAssignable(res, args.slice(1, args.length))
                        break
                    default:
                        showHelp(res)
                }
            } else {
                showHelp(res)
            }
        } else {
            res.reply("Sadly I don't have the permission to alter roles and/or permissions.")
        }
    })
}
