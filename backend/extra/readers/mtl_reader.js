const xl = require("exceljs");

const float = function(num){
  if(!num) return 0;
  if(parseFloat(num) == 0 || !!parseFloat(num)){
    return parseFloat(num)
  } else throw new Error("inv_format: The cell doesn't contain a decimal")
}

module.exports = async function(_path){
  const wb = new xl.Workbook();
  let file = await wb.xlsx.readFile(_path);
  let sheet = file.worksheets[0];
  let rowIndex = 1;
  let records = [];
  if(sheet.getCell("A1").text.toLowerCase() !== "mtl insurance company") 
    throw new Error("inv_format")
  while(!!sheet.getCell("A"+(++rowIndex)).text){
    let temp = {
      "year": rowIndex-1,
      "premium": float(sheet.getCell("A"+rowIndex).text),
      "guaranteedCV": float(sheet.getCell("E"+rowIndex).text),
      "currentCV": float(sheet.getCell("F"+rowIndex).text),
      "db": float(sheet.getCell("G"+rowIndex).text)
    }
    records.push(temp);
  }
  return records;
}
