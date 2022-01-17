const mongo = require("mongodb");

let client = null;
mongo.connect(process.env.MONGOURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, function(err, c){
  if(err) console.log(err);
  client = c.db("fortune-law");
})

const admin = {
  key: 'ni3dfWggItkeq5nMx2jzqu4ZghFdJ9fnLqfJLNkn9pQ=',
  id: 'Q+BUQCG2vDPQT5450mnlbA'
}

module.exports = async function(req, res, next){
  let authkey = req.headers.authorization;
  if(authkey){
    let role = authkey.substr(0, 5);
    let key = authkey.substring(6, authkey.length);
    let agentdb = client.collection("agents");
    if(role == "agent"){
      let agent = await agentdb.findOne({key});
      if(agent){
        req.agent = agent;
        next()
      } else res.sendStatus(401)
    } else if (role == "admin" && key == admin.key) {
      let agent = await agentdb.findOne({id: req.params.agentid});
      if(!agent){
        let delAgentdb = client.collection("del-agents");
        agent = await delAgentdb.findOne({id: req.params.agentid})
      }
      if(agent) {
        req.agent = agent;
        next();
      } else res.sendStatus(401)
    } else res.sendStatus(401);
  } else res.sendStatus(401);
}
