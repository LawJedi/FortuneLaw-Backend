const xl = require("exceljs");

const float = function(num){
  if(!num) return 0;
  if(parseFloat(num) == 0 || !!parseFloat(num)){
    return parseFloat(num)
  } else throw new Error("inv_format: The cell doesn't contain a decimal")
}

module.exports = async function(_path){
  const workbook = new xl.Workbook();
  let wb = await workbook.xlsx.readFile(_path)
  let sheet = wb.worksheets[0];
  let rowIndex = 0; // data row start from 20th row
  while(isNaN(parseInt(sheet.getCell("AG"+(rowIndex+1)).value))){
    if(rowIndex >= 35){
      throw new Error("inv_format")
    }
    rowIndex++
  }
  // rowIndex--;
  let year = 0;
  let records = [];
  while(!!sheet.getCell("AG"+(++rowIndex)).text){
    let temp = {
      "year": ++year,
      "premium": float(sheet.getCell("AG"+rowIndex).text),
      "guaranteedCV": float(sheet.getCell("R"+rowIndex).text),
      "currentCV": float(sheet.getCell("AI"+rowIndex).text),
      "db": float(sheet.getCell("AM"+rowIndex).text),
    };
    records.push(temp);
  };
  //if(!!id) fs.writeFileSync(path.join(__dirname, "..", "..", "results", id, "illustration.json"), JSON.stringify(records))
  return records;
}
