const exp = require("express");
const app = exp.Router();
const crypt = require("crypto")

let client = null;
const mongo = require("mongodb");
mongo.connect("mongodb://127.0.0.1:27017/", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(c => {
  client = c.db("fortune-law");
}).catch(e => {
  console.log(e)
  process.exit()
})

const mailer = require("./mail")
const auth = require("./auth")

function keyUID(a){
  let joinTime = new Date().getTime();
  let keyString = joinTime+a.p;
  let key = crypt.createHash("sha3-256").update(keyString).digest("hex");
  let id = crypt.createHash("md5").update(a.e).digest("hex")
  return {key, id}
}

app.post("/reg", exp.json(), async function(req, res){
  let agentdb = client.collection("agents");
  let member = req.body;
  if(member && member.p.length >= 8){
    let agentEmail = await agentdb.findOne({email: member.e});
    if(agentEmail){
      res.status(400).json({
        msg: "Member already present"
      })
      return;
    }
    let uid = keyUID(member);
    let agentData = {
      id: uid.id,
      email: member.e,
      first_name: member.f.trim(),
      last_name: member.l.trim(),
      full_name: member.f+" "+member.l,
      password: member.p,
      key: uid.key,
      accessStatus: false,
      company_name: member.c.trim(),
      ms_plan: 0,
      telephone: member.t,
      date: new Date().getTime()
    };
    let {insertedId} = await agentdb.insertOne(agentData);
    res.sendStatus(200)
    mailer.registrationMail(agentData);
  } else res.status(400).json({msg: "Incomplete data"});
})

app.post("/login", exp.json(), async function(req, res){
  let agentdb = client.collection("agents");
  let creds = req.body;
  if(creds.e && creds.p){
    let member = await agentdb.findOne({email: creds.e});
    if(member){
      if(member.password === creds.p){
        var memObj = {
          id: member.id,
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
          name: member.first_name+" "+member.last_name,
          key: member.key
        };
        if(member.accessStatus == false) res.status(400).json({msg: "Access Denied. Contact Admin for details"});
        else res.json(memObj);
      } else res.status(400).json({msg: "Password doesn't match"});
    } else res.status(400).json({msg: "Email doesn't exist"});
  } else res.status(400).json({msg: "Bad Request"});
})

app.post("/password", auth, exp.json(), async function(req, res){
  let agentdb = client.collection("agents");
  let {oldp, newp} = req.body;
  if(oldp && newp && newp.length >= 8){
    if(oldp == req.agent.password){
      let agent = await agentdb.updateOne({_id: mongo.ObjectId(req.agent._id.toString())}, {$set: {password: newp}});
      agent.result.nModified ? res.sendStatus(200) : res.sendStatus(400)
    } else res.status(400).json({msg: "Old password doesn't match"})
  } else res.status(400).json({msg: "Bad Request"})
})

app.get("/self", auth, async function(req, res){
  if(req.agent){
    let filteredAgentData = {};
    let fields = ["email", "first_name", "last_name", "full_name", "company_name", "website", "telephone", "ms_plan"].sort();
    fields.forEach( f => {
      filteredAgentData[f] = req.agent[f];
    })
    res.json(filteredAgentData);
  } else res.sendStatus(401);
})

app.post("/self/:field/", auth, exp.json(), async function(req, res){
  let data = req.body.d;
  let {field} = req.params;
  console.log(data, field)
  if(req.agent){
    const updateFields = ["telephone", "company_name"];
    if(updateFields.includes(field)){
      let agentdb = client.collection("agents");
      let updateAgent = await agentdb.updateOne({_id: mongo.ObjectId(req.agent._id.toString())}, {$set:{
        [field] : data
      }})
      updateAgent.result.nModified == 1 ? res.sendStatus(200) : res.sendStatus(400);
    } else res.sendStatus(400);
  } else res.sendStatus(401)
})

app.post("/reset", exp.json(), async function(req, res){
  let email = req.body.e;
  if(email){
    let time = new Date().getTime();
    let resetId = crypt.createHash("sha3-256").update(email+time).digest("hex");
    let resetdb = client.collection("reset");
    try{
      let agentPresent = await client.collection("agents").findOne({email})
      if(!agentPresent){
        res.status(400).json({msg: "Email is not registered"})
        return;
      }
      await resetdb.deleteOne({email});
      await resetdb.insertOne({
        link: resetId,
        email
      })
      let base = "http://goldenigic.com/reset?id="+resetId;
      await mailer.resetMail(email, base);
      res.sendStatus(200);
    } catch(e){
      res.status(500).json({msg: "Server error"})
    }
  } else res.status(400).json({msg: "Email not present"})
})

app.get("/reset/validation/:id", async function(req, res){
  let {id} = req.params;
  if(id){
    let resetdb = client.collection("reset");
    let doc = await resetdb.findOne({link : id});
    doc ? res.sendStatus(200) : res.sendStatus(404)
  } else res.sendStatus(404)
})

app.post("/reset/pass/", exp.json(), async function(req, res){
  let {id, p} = req.body;
  if(id && p && p.length >= 8){
    let db = client.collection("reset");
    let resultDoc = await db.findOne({link : id});
    if(!resultDoc){
      res.status(400).json({msg: "Invalid or expired link"});
      return
    }
    let {email} = resultDoc;
    db = client.collection("agents");
    if(email){
      let update = await db.updateOne({email}, {$set: {
        password: p
      }})
      update.result.nModified ? res.sendStatus(200) : res.status(400).json({msg: "Failed to change password"})
      client.collection("reset").deleteOne({email});
    } else res.status(400).json({msg: "Email address doesn't exist"})
  } else res.status(400).json({msg: "Bad request"})
})

module.exports = app;