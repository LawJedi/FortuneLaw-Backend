var request = require("request");
const fs = require("fs");
const path = require("path");

const API_KEY = "0bde8a98-9102-4d3f-9730-0cff254ac553";

function genProp(propName, propVal){
  return {property: propName, value: propVal};
}
function genField(key, val){
  return {
    name: key,
    value: val
  }
}

const hubSpot = {
  parseContactInfo(data){
    let props = [];
    props.push(genProp("firstname", data.first_name));
    props.push(genProp("lastname", data.last_name));
    props.push(genProp("email", data.email));
    props.push(genProp("state", data.residence));

    return {properties: props};
  },
  createContact(contactInfo, cb){
    var options = {
      method: "POST",
      url: "https://api.hubapi.com/contacts/v1/contact/",
      qs: {hapikey: API_KEY},
      headers: {
        'Content-Type': 'application/json'
      },
      body: contactInfo,
      json: true
    }
    request(options, cb);
  },
  uploadIllustration(fileName, cid, cb, uploadType){
    const uploadURL = 'https://api.hubapi.com/filemanager/api/v3/files/upload?hapikey='+API_KEY;
    
    // file options - no chnage
    var fileOptions = {
      access: 'PUBLIC_INDEXABLE',
      ttl: 'P3M',
      overwrite: false,
      duplicateValidationStrategy: 'NONE',
      duplicateValidationScope: 'ENTIRE_PORTAL'
    };

    // form data json
    var formData = {
        // file: fs.createReadStream(path.join(__dirname, "..", "uploads", fileName+".xlsx")),
        file: fs.createReadStream(path.join(__dirname, "uploads", fileName)),
        options: JSON.stringify(fileOptions),
        folderPath: 'illustrations'
    };

    // upload to file manager
    request.post({
      url: uploadURL,
      formData
    }, function(err, res, body){

      if(err) {
        console.log(err);
        return;
      };
      
      const uploadID = JSON.parse(body).objects[0].id;

      // request options
      var options = { 
        method: 'POST',
        url: 'https://api.hubapi.com/engagements/v1/engagements',
        qs: { hapikey: API_KEY },
        headers:  {'Content-Type': 'application/json' },
        body: { 
          engagement: { 
              active: true,
              ownerId: 1,
              type: 'NOTE',
              timestamp: new Date().getTime()
            },
          associations: 
            { contactIds: [ cid ] },
          attachments: [ { id: uploadID } ],
          metadata: { body: 'illustration - '+uploadType } 
        },
        json: true, 
      };
      
      // request for engagements
      request(options, cb)
    })
  },
  parseDebtInfo(data){
    let fields = [];
    
    // contact information
    fields.push(genField("firstname", data.first_name));
    fields.push(genField("lastname", data.last_name));
    fields.push(genField("email", data.email));
    fields.push(genField("date_of_birth", parseInt(data.retire_year) - parseInt(data.retirement_age)));
    fields.push(genField("state", data.residence));

    // mortgage information
    let mortgageCount = Math.min(data.mortgages.length, 3);
    fields.push(genField("num_mortgages", mortgageCount));
    for(let i = 0; i < mortgageCount; i++){
      let ind = i+1;
      fields.push(genField("mortgage_"+ind, data.mortgages[i][0]));
      fields.push(genField("p_i"+ind, data.mortgages[i][1]));
      fields.push(genField("mortgage_balance_"+ind, data.mortgages[i][3]));
      fields.push(genField("years_left_on_mortgage_"+ind, data.mortgages[i][4]));
      fields.push(genField("interest_rate_mortgage_"+ind, data.mortgages[i][5]));
    }

    // debts information
    let debtCount = Math.min(data.outstanding_debts.length, 7);
    fields.push(genField("num_debts", debtCount));
    for(let i = 0; i < debtCount; i++){
      let ind = i+1;
      fields.push(genField("debt_"+ind, data.outstanding_debts[i][0]));
      fields.push(genField("debt_balance_"+ind, data.outstanding_debts[i][1]));
      fields.push(genField("interest_rate_debt_"+ind, data.outstanding_debts[i][2]));
      fields.push(genField("minimum_payment_debt_"+ind, data.outstanding_debts[i][3]));
      fields.push(genField("actual_payment_debt_"+ind, data.outstanding_debts[i][4]));
    }

    // agent information
    let filename = data.email.replace(/[@|.]/gi, "_")+"_"+data.file_ref+".xlsx";
    fields.push(genField("agent_first_name", data.agent_first_name));
    fields.push(genField("agent_last_name", data.agent_last_name));
    fields.push(fields.push(genField("debt_csv", filename)));

    fields.pop()
    return fields;
  },
  createDebtSheet(debtInfo, cb){
    const formSubmitURL = "https://api.hsforms.com/submissions/v3/integration/submit/7046200/4ef7d7af-9601-40c1-80ff-03f31f67ee1c/";
    let formObj = {
      fields: debtInfo,
      legalConsentOptions: null
    }
    request.post({
      url: formSubmitURL,
      headers:  {'Content-Type': 'application/json' },
      body: JSON.stringify(formObj)
    }, cb)
  }
}

module.exports = function(data){
  let fileName = data.email.replace(/[@|.]/gi, "_")+"_"+data.file_ref+".xlsx";
  let debtInfo = hubSpot.parseDebtInfo(data);
  hubSpot.createDebtSheet(debtInfo, function(dberr, dbres, dbbody){
    if(dberr){
      console.log(dberr);
      return dberr;
    }
    if(dbres.statusCode == 200){
      request.get({
        url: "https://api.hubapi.com/contacts/v1/contact/email/"+data.email+"/profile",
        qs: {hapikey: API_KEY},
        json: true,
      }, function(err, res, body){
        if(res.statusCode == 200){
          const contactID = body.vid;
          hubSpot.uploadIllustration(fileName, contactID, function(err, res, body){
            if(err){
              console.log(err)
              return;
            }
            console.log(body)
          }, data.insurer)
        } else return;
      })
    }
  })
};