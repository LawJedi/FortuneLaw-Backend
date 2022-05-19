const exp = require("express");
const router = exp.Router();
const mongo = require("mongodb");
const path = require("path")
const fs = require("fs");

const auth = require("./auth");
const crypt = require("crypto");
const urlShortener = require("node-url-shortener");
const mailer = require("./mail");

let client = null;
mongo.connect(process.env.MONGOURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(c => {
    client = c.db("fortune-law");
}).catch(e => {
    console.log(e)
    process.exit()
})

router.get("/form/generate/:agentid", auth, async function(req, res) {
    let formdb = client.collection("user-forms");
    if (req.agent) {
        let { agent } = req;
        let formid = (await formdb.insertOne({
            agent_id: agent.id,
            agent_fname: agent.first_name,
            agent_lname: agent.last_name,
            agent_email: agent.email,
            key: agent.key
        })).insertedId.toString();
        let base = "https://fortuneplanning.com/client-form?formid=" + formid;
        // urlShortener.short(base, function(err, url){
        //   if(err) res.status(200).json({url: base})
        //   else res.json({url})
        // })
        res.json({ url: base })
    } else res.sendStatus(400)
})

router.get("/form/validate", async function(req, res) {
    let { formid, fname, lname } = req.query;
    let formdb = client.collection("user-forms");
    let agent = await formdb.findOne({ _id: mongo.ObjectId(formid) });
    if (agent) {
        res.status(200).json({
            f: agent.agent_fname,
            l: agent.agent_lname,
            e: agent.agent_email,
            i: agent.agent_id,
            k: agent.key
        });
        await formdb.deleteOne({ _id: mongo.ObjectId(formid) });
        await mailer.clientMail(agent.agent_email, { agent_last_name: agent.agent_lname, fname, lname });
    } else res.sendStatus(400)
})


router.get("/:agentid/search", auth, async function(req, res) {
    let { agentid } = req.params;
    let { name } = req.query;
    if (name) {
        let agentCol = client.collection(agentid);
        let docs = await agentCol.aggregate([
            { $addFields: { "full_name": { $concat: ["$first_name", " ", "$last_name"] } } },
            { $match: { "full_name": name } }
        ]).toArray();
        let result = docs.map(d => {
            return {
                _id: d._id.toString(),
                name: d.full_name,
                residence: d.residence
            }
        })
        res.json(result);
    } else res.sendStatus(400)
})

router.get("/:agentid/:page", auth, async function(req, res) {
    let { agentid, page = 1 } = req.params;
    if (agentid && page) {
        var clientCollection = client.collection(agentid);
        let docs = await clientCollection.find().sort({ $natural: -1 }).skip(10 * (page - 1)).limit(10).toArray();
        let result = docs.map(d => {
            return {
                _id: d._id.toString(),
                name: d.first_name + " " + d.last_name,
                residence: d.residence
            }
        })
        res.json(result);
    } else res.sendStatus(400);
})

router.get("/detail/:agentid/:clientid", auth, async function(req, res) {
    let { clientid, agentid } = req.params;
    if (clientid) {
        let agentCol = client.collection("fortune-law");
        let clientData = await agentCol.findOne({ _id: mongo.ObjectId(clientid), "agent_id": agentid });
        res.json(clientData);
    } else res.sendStatus(400);
})

router.get("/illustration/:ref/:email/:last", async function(req, res) {
    let femail = req.params.email.replace(/[@|.]/gi, "_");
    let { ref, last } = req.params;
    if (ref && femail) {
        let file = path.join(__dirname, "uploads", femail + "_" + ref + ".xlsx");
        if (fs.existsSync(file)) {
            res.download(file, last + "_GOLDEN.xlsx");
        } else res.sendStatus(404);
    } else res.sendStatus(400)
})


module.exports = router;