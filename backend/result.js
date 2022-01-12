const exp = require("express");
const router = exp.Router();
const fs = require("fs");
const path = require("path");
const generatePDF = require("./pdf_generator")

router.get("/:id", function(req, res){
  var {id} = req.params;
  var filePath = path.join(__dirname, "..", "results", id);
  if(fs.existsSync(filePath)){
    res.sendFile(filePath+"/index.html")
  }
})

router.get("/:id/pdf", async function(req, res){
  var {id} = req.params;
  var filePath = path.join(__dirname, "..", "results", id);
  if(fs.existsSync(filePath)){
    try{
      var templateData = JSON.parse(fs.readFileSync(filePath+"/template_data.json").toString());
      generatePDF(templateData, id);
      res.sendStatus(200);
    } catch(e) {
      console.log(e);
      res.status(500).json({msg: "Cannot generate PDF. Something went wrong."});
    }
  } else res.status(400).json({msg: "Cannot generate PDF. Need to run calculations first."})
})

router.get("/:id/pdf/download", async function(req, res){
  var {id} = req.params;
  var filePath = path.join(__dirname, "..", "results", id);
  if(fs.existsSync(filePath)){
    let pdfPath = path.join(filePath, "result.pdf");
    fs.existsSync(pdfPath) ? res.sendFile(pdfPath) : res.status(500).send("Generate PDF before attempting to download the pdf");
  } else res.status(500).json({msg: "Cannot generate PDF. Need to run calculations first."})
})

module.exports = router;