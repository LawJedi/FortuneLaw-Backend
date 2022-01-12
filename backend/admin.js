const exp = require("express");
const router = exp.Router();
const mongo = require("mongodb");

let client = null;
mongo.connect("mongodb://localhost:27017/", {
  useUnifiedTopology: true,
  useNewUrlParser: true
}, async function(err, c){
  if(err) process.exit(0);
  client = c.db("fortune-law")
  let admindb = client.collection("admin");
  adminCreds = await admindb.findOne({})
})

// const adminCreds = {
//   key: 'ni3dfWggItkeq5nMx2jzqu4ZghFdJ9fnLqfJLNkn9pQ=',
//   id: 'Q+BUQCG2vDPQT5450mnlbA'
// }

const adminPass = function(req, res, next){ 
  let authkey = req.headers.authorization;
  if(authkey){
    let role = authkey.substr(0, 5);
    let key = authkey.substring(6, authkey.length);
    if(role == "admin" && key == adminCreds.key){
      next()
    } else res.sendStatus(401)
  } else res.sendStatus(401)
}

router.post("/login", exp.json(), async function(req, res){
  let creds = req.body;
  if(creds.p){
    let admindb = client.collection("admin");
    let admin = await admindb.findOne();
    if(creds.p === admin.password){
      res.json({k: "admin-"+admin.key});
    } else res.sendStatus(401);
  } else res.sendStatus(400);
})

router.post("/password", adminPass, exp.json(), async function(req, res){
  let {oldp, newp} = req.body;
  let admindb = client.collection("admin");
  let admin = await admindb.findOne();
  if(oldp && newp && newp.length >= 8){
    if(oldp == admin.password){
      let result = await client.collection("admin").updateOne({}, {$set: {
        password: newp
      }});
      result.result.nModified ? res.sendStatus(200) : res.sendStatus(401);
    } else res.status(401).json({msg: "Incorrect old passwword"});
  } else res.sendStatus(400)
})

router.get("/agents/:page", adminPass, async function(req, res){
  let agentdb = client.collection("agents");
  let {page} = req.params;
  try {
    let agents = await agentdb.find().sort({$natural: -1}).skip(20*(page-1)).limit(20).toArray();
    agents = agents.map( a => {
      return {
        _: a._id,
        n: a.first_name+" "+a.last_name,
        f: a.first_name,
        l: a.last_name,
        e: a.email,
        i: a.id,
        a: a.accessStatus,
        c: a.company_name,
        t: a.telephone,
        m: a.ms_plan,
        d: a.date,
        s: false,
        v: ''
      }
    })
    res.json(agents);
  } catch(e){
    res.sendStatus(500);
  }
})

router.get("/agent/toggle/:agentid", adminPass, async function(req, res){
  let agentdb = client.collection("agents");
  let {agentid} = req.params;
  let agent = await agentdb.findOne({id: agentid});
  let result = await agentdb.updateOne({id: agentid}, {$set: {accessStatus: !agent.accessStatus}});
  result.result.nModified ? res.sendStatus(200) : res.sendStatus(500)
})

router.put("/agent/membership/:agentid/:plan", adminPass, async function(req, res){
  let {agentid, plan} = req.params;
  plan = parseInt(plan);
  let plans = ["Not Assigned", "Agent", "FLF Team"]
  if(agentid && plan >= 0 && plan <= 2){
    let agentdb = client.collection("agents");
    let updateAgent = await agentdb.updateOne({_id: mongo.ObjectId(agentid)}, {$set: {
      ms_plan: plan
    }})
    updateAgent.result.nModified ? res.sendStatus(200) : res.sendStatus(400);
  } else res.sendStatus(400)
})

router.get("/agent/search", adminPass, async function(req, res){
  let agentName = req.query.n;
  let agentdb = client.collection("agents");
  let agents = await agentdb.find({full_name: agentName}).toArray();
  agents = agents.map( a => {
    return {
      _: a._id,
      n: a.first_name+" "+a.last_name,
      f: a.first_name,
      l: a.last_name,
      e: a.email,
      i: a.id,
      a: a.accessStatus,
      c: a.company_name,
      t: a.telephone,
      m: a.ms_plan,
      d: a.date,
      s: false,
      v: ''
    }
  })
  res.json(agents)
})

router.delete("/agent/:agent_id", adminPass, async function(req, res){
  let {agent_id} = req.params;
  try{
    if(agent_id){
      let agentdb = client.collection("agents");
      let agent = await agentdb.findOne({_id: mongo.ObjectId(agent_id)});
      let ai, ad;
      if(agent){
        ai = await client.collection("del-agents").insertOne(agent);
        ad = await agentdb.deleteOne({_id: mongo.ObjectId(agent_id)}); 
      }
      (ad && ad.deletedCount) ? res.sendStatus(200) : res.sendStatus(400);
    } else res.sendStatus(400)
  } catch(e){

  }
})

router.get("/validate/", adminPass, async function(req, res){
  res.sendStatus(200)
})

router.get("/clients", adminPass, async function(req, res){
  let {agent, name} = req.query;
  let clientdb = client.collection("fortune-law");
  let queryObj = {};
  !!agent ? queryObj.agent_name = {$regex: new RegExp(agent), $options: "g"} : false;
  !!name ? queryObj.client_name = {$regex: new RegExp(name), $options: "g"} : false;
  let filteredClients = await clientdb.aggregate([
    {$addFields: {
      "client_name" : {$concat : ["$first_name", " ", "$last_name"]},
      "agent_name": {$concat : ["$agent_first_name", " ", "$agent_last_name"]}
      },
    },{
      $match: queryObj
    }
  ]).toArray();
  let result = filteredClients.map( d => {
    return {
      _: d._id.toString(),
      name: d.client_name,
      residence: d.residence,
      agent: {
        _: d.agent_id,
        n: d.agent_name,
        e: d.agent_email
      }
    }
  });
  res.json(result);
})



module.exports = router;