const exp = require("express");
const multer = require("multer");
const app = exp();
const cors = require("cors")
app.use(cors({
  origin: ["https://fortune-law.netlify.app","http://goldenigic.com","https://goldenigic.com", "http://localhost:8080"],
  allowedHeaders: ["Content-type", "Authorization"]
}))

const fs = require("fs");
const path = require("path");
const crypt = require("crypto");

const auth = require("./auth");
const customer = require("./client")
const admin = require("./admin");
const result = require("./result");
const agent = require("./agent")

const generateRef = () => {
  return Buffer.from(crypt.randomBytes(6)).toString("hex");
}
function keyUID(a){
  let joinTime = new Date().getTime();
  let keyString = joinTime+a.p;
  let key = crypt.createHash("sha3-256").update(keyString).digest("hex");
  let id = crypt.createHash("md5").update(a.e).digest("hex")
  return {key, id}
}

const extra = (fileName) => require(`./extra/${fileName}.js`);
const _exports = extra("fileWriter");
const serializeData = extra("serialize_data");

const readers = {
  penn: require("./extra/readers/penn_reader"),
  mtl: require("./extra/readers/mtl_reader"),
  other: require("./extra/readers/other_reader")
}

const hubspot = require("./extra/hubspot");

let client = null;
const mongo = require("mongodb");
mongo.connect("mongodb+srv://admin:fortunelaw@c0.cbypr.mongodb.net/test?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(c => {
  client = c.db("fortune-law");
}).catch(e => {
  console.log(e)
  process.exit()
})

app.post("/upload/:type", multer({storage: multer.memoryStorage()}).single("file"), async function(req, res){
  if(req.file){
    let ref = generateRef();
    let fileName = req.file.originalname.split(".")[0]+"_"+ref;
    let uploadPath = path.join(__dirname, "uploads", fileName+".xlsx");
    try{
      fs.writeFileSync(uploadPath, req.file.buffer);
      let ill = await readers[req.params.type](uploadPath);
      if(req.body.lib_id && req.body.agent_id){
        let docId = req.body.lib_id, agentId = req.body.agent_id;
        let updateDoc = {
          $set: {
            file_ref: ref,
            insurer: req.params.type
          }
        }
        await client.collection("fortune-law").updateOne({_id: mongo.ObjectId(docId)}, updateDoc);
        await client.collection(agentId).updateOne({_id: mongo.ObjectId(docId)}, updateDoc);
      }
      res.send(ref);
    } catch(e){
      console.log(e);
      fs.unlinkSync(uploadPath)
      res.status(500).send({message: "Uploaded illustration file does not correspond to correct template."})
    }
  }
})
app.post("/save/", auth, exp.json(), async function(req, res){
  let data = req.body;
  let agentid = data.agent_id;
  try {
    let _id = await client.collection("fortune-law").insertOne(data);
    data._id = mongo.ObjectId(_id.insertedId.toString());
    await client.collection(agentid).insertOne(data);
    id = _id.insertedId.toString();
    res.send(id);
  } catch(e){
    res.sendStatus(500)
  }
})

app.post("/debts", exp.json(), async function(req, res){
  let data = req.body;
  let id, agentid = data.agent_id;
  try {
    if(!data.file_ref.trim()){
      throw new Error("no_file : Illustration file missing. Upload the illustration file before submitting.")
    }

    // add data to database
    if(data._id){
      id = data._id;
      delete data._id;
      await client.collection(agentid).replaceOne({_id: mongo.ObjectId(id)}, data);
      await client.collection("fortune-law").replaceOne({_id: mongo.ObjectId(id)}, data);
    } else {
      let _id = await client.collection("fortune-law").insertOne(data);
      data._id = mongo.ObjectId(_id.insertedId.toString());
      await client.collection(data.agent_id).insertOne(data);
      id = _id.insertedId.toString();
    }

    const _path = path.join(__dirname, "..", "results", id);
    // fs.rmdirSync(_path, {
    //   recursive: true
    // })
    fs.mkdirSync(_path, {
      recursive: true
    });
    var debtsInfo = _exports.debtsAndMortgages(data, _path);
    var illustration = await _exports.illustration(data, _path);
    // mortgage included debts
    var annualPayoff = _exports.payoff(debtsInfo, illustration, _path);
    var comparison = _exports.differenceSummary(debtsInfo, illustration, _path);
    var indexData = {
      ...comparison,
      ...annualPayoff
    }

    // non mortgage included debts
    var annualPayoffNM = _exports.payoffNM(debtsInfo, illustration, _path);
    var comparisonNM = _exports.differenceSummaryNM(debtsInfo, illustration, _path);
    var indexDataNM = {
      ...comparisonNM,
      ...annualPayoffNM
    }
    _exports.templateData(serializeData(data.first_name, data.last_name, data.agent_first_name + " " + data.agent_last_name, {...indexData, ...indexDataNM}), _path);

    // hubspot(data)

    res.send({id});
  } catch(e){
    console.log(e);
    client.collection("fortune-law").deleteOne({_id: mongo.ObjectId(id)})
    client.collection(agentid).deleteOne({_id: mongo.ObjectId(id)})
    let [errCode, errMsg] = e.message.split(":")
    if(errCode.trim() == "inv_debt_mp"){
      res.status(500).send({message: "Invalid Data for " + errMsg});
    } else if(errCode.trim() == "no_file"){
      res.status(500).send({message: errMsg});
    } else if(errCode.trim() == "inv_format"){
      res.status(500).send({message: errMsg});
    } else {
      res.sendStatus(500);
    } 
  }  
})

// app.post("/reg", exp.json(), async function(req, res){
//   let agentdb = client.collection("agents");
//   let member = req.body;
//   if(member && member.p.length >= 8){
//     let agentEmail = await agentdb.findOne({email: member.e});
//     if(agentEmail){
//       res.status(400).json({
//         msg: "Member already present"
//       })
//       return;
//     }
//     let uid = keyUID(member);
//     let agentData = {
//       id: uid.id,
//       email: member.e,
//       first_name: member.f.trim(),
//       last_name: member.l.trim(),
//       full_name: member.f+" "+member.l,
//       password: member.p,
//       key: uid.key,
//       accessStatus: false,
//       company_name: member.c.trim(),
//       ms_plan: 0,
//       telephone: member.t,
//       date: new Date().getTime()
//     };
//     let {insertedId} = await agentdb.insertOne(agentData);
//     res.sendStatus(200)
//     mailer.registrationMail(agentData);
//   } else res.status(400).json({msg: "Incomplete data"});
// })

// app.post("/login", exp.json(), async function(req, res){
//   let agentdb = client.collection("agents");
//   let creds = req.body;
//   if(creds.e && creds.p){
//     let member = await agentdb.findOne({email: creds.e});
//     if(member){
//       if(member.password === creds.p){
//         var memObj = {
//           id: member.id,
//           email: member.email,
//           firstName: member.first_name,
//           lastName: member.last_name,
//           name: member.first_name+" "+member.last_name,
//           key: member.key
//         };
//         if(member.accessStatus == false) res.status(400).json({msg: "Access Denied. Contact Admin for details"});
//         else res.json(memObj);
//       } else res.status(400).json({msg: "Password doesn't match"});
//     } else res.status(400).json({msg: "Email doesn't exist"});
//   } else res.status(400).json({msg: "Bad Request"});
// })

// app.post("/password", auth, exp.json(), async function(req, res){
//   let agentdb = client.collection("agents");
//   let {oldp, newp} = req.body;
//   if(oldp && newp && newp.length >= 8){
//     if(oldp == req.agent.password){
//       let agent = await agentdb.updateOne({_id: mongo.ObjectId(req.agent._id.toString())}, {$set: {password: newp}});
//       agent.result.nModified ? res.sendStatus(200) : res.sendStatus(400)
//     } else res.status(400).json({msg: "Old password doesn't match"})
//   } else res.status(400).json({msg: "Bad Request"})
// })

// app.get("/self", auth, async function(req, res){
//   if(req.agent){
//     let filteredAgentData = {};
//     let fields = ["email", "first_name", "last_name", "full_name", "company_name", "website", "telephone", "ms_plan"].sort();
//     fields.forEach( f => {
//       filteredAgentData[f] = req.agent[f];
//     })
//     res.json(filteredAgentData);
//   } else res.sendStatus(401);
// })

// app.post("/self/:field/", auth, exp.json(), async function(req, res){
//   let data = req.body.d;
//   let {field} = req.params;
//   console.log(data, field)
//   if(req.agent){
//     const updateFields = ["telephone", "company_name"];
//     if(updateFields.includes(field)){
//       let agentdb = client.collection("agents");
//       let updateAgent = await agentdb.updateOne({_id: mongo.ObjectId(req.agent._id.toString())}, {$set:{
//         [field] : data
//       }})
//       updateAgent.result.nModified == 1 ? res.sendStatus(200) : res.sendStatus(400);
//     } else res.sendStatus(400);
//   } else res.sendStatus(401)
// })

// app.post("/reset", exp.json(), async function(req, res){
//   let email = req.body.e;
//   if(email){
//     let time = new Date().getTime();
//     let resetId = crypt.createHash("sha3-256").update(email+time).digest("hex");
//     let resetdb = client.collection("reset");
//     try{
//       let agentPresent = await client.collection("agents").findOne({email})
//       if(!agentPresent){
//         res.send(400).json({msg: "Email is not registered"})
//         return;
//       }
//       await resetdb.deleteOne({email});
//       await resetdb.insertOne({
//         link: resetId,
//         email
//       })
//       let base = "http://goldenigic.com/reset/"+resetId;
//       await mailer.resetMail(email, base);
//       res.sendStatus(200);
//     } catch(e){
//       res.sendStatus(500)
//     }
//   } else res.sendStatus(400)
// })

// app.get("/reset/validation/:id", async function(req, res){
//   let {id} = req.params;
//   if(id){
//     let resetdb = client.collection("reset");
//     let doc = await resetdb.findOne({link : id});
//     doc ? res.sendStatus(200) : res.sendStatus(404)
//   } else res.sendStatus(404)
// })

// app.post("/reset/pass/", exp.json(), async function(req, res){
//   let {id, p} = req.body;
//   if(id && p && p.length >= 8){
//     let db = client.collection("reset");
//     let resultDoc = await db.findOne({link : id});
//     let {email} = resultDoc;
//     db = client.collection("agents");
//     if(email){
//       let update = await db.updateOne({email}, {$set: {
//         password: p
//       }})
//       update.result.nModified ? res.sendStatus(200) : res.status(400).json({msg: "Failed to change password"})
//       client.collection("reset").deleteOne({email});
//     } else res.status(400).json({msg: "Email address doesn't exist"})
//   } else res.sendStatus(400).json({msg: "Bad request"})
// })

app.use("/", agent);
app.use("/client", customer);
app.use("/admin", admin);
app.use("/result", result);

app.listen(process.env.PORT, ()=>{
  console.log("Fortune Law @ "+process.env.PORT)
})

// module.exports = app;