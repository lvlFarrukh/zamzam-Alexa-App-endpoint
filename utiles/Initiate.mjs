import Usage from "../modal/Usage.mjs"

const setUserData = () => {
    var newUsage = new Usage({
        skillName: "Zamzam food Ording skill",
        clientName: "Saylani Class",
    }).save();
} 

export {
    setUserData
}