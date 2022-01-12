const xl = require("exceljs");
const path = require("path");

const float = function(num){
  if(!num) return 0;
  if(parseFloat(num) == 0 || !!parseFloat(num)){
    return parseFloat(num)
  } else throw new Error("inv_format: The cell doesn't contain a decimal")
}

const checkInt = function(sheet, cell){
  return isNaN(parseInt(sheet.getCell(cell).value))
}

module.exports = async function(_path){
  const workbook = new xl.Workbook();
  let wb = await workbook.xlsx.readFile(_path)
  let sheet = wb.worksheets[0];
  let rowIndex = 0;
  let year = 0;
  if(sheet.getCell("A1").value.toLowerCase() !== "year"){
    throw new Error("inv_format")
  }
  while(isNaN(parseInt(sheet.getCell("A"+(rowIndex+1)).value))) {
    if(rowIndex >= 2){
      throw new Error("inv_format")
    }
    rowIndex++
  };
  let records = [];
  while(!!sheet.getCell("A"+(++rowIndex)).text){
    let temp = {
      "year": ++year,
      "premium": float(sheet.getCell("B"+rowIndex).text),
      "guaranteedCV": float(sheet.getCell("C"+rowIndex).text),
      "currentCV": float(sheet.getCell("D"+rowIndex).text),
      "db": float(sheet.getCell("E"+rowIndex).text),
    };
    records.push(temp);
  };
  return records;
}