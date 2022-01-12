const fs = require("fs");
const path = require("path");
const dfunc = require("./debt");
const mfunc = require("./mortgage");
const calc = require("./main");
const payoff = require("./payoff_savings");
const annualSchedule = require("./annual");

/* excel reader */
const readers = {
  penn: require("./readers/penn_reader"),
  mtl: require("./readers/mtl_reader"),
  other: require("./readers/other_reader")
}

function twoDigit(str){
  if(str){
    let n = parseInt(str).toString().substr(0, 2);
    if(n.length == 1) return n+"0";
    else return n;
  } else return "00"
}

module.exports = {
  debtsAndMortgages: function(data, _path){
    var coll = [];
    coll = coll.concat(mfunc.info(data.mortgages));
    coll = coll.concat(dfunc.info(data.outstanding_debts));
    fs.writeFileSync(path.join(_path, "debts_record.json"), JSON.stringify(coll));
    return coll
  },
  illustration: async function(data, _path){
    // {startYear, retireYear, illustration[]}
    var date = new Date();
    var result = {
      retireYear: {y: data.retire_year, m: 12},
      startYear: {y: date.getFullYear(), m: date.getMonth()+1},
      illustration: null
    }
    var xlFile = data.email.replace(/[@|.]/gi, "_")+"_"+data.file_ref+".xlsx";
    var xlPath = path.join(__dirname, "..", "uploads", xlFile);
    result.illustration = await readers[data.insurer](xlPath);
    fs.writeFileSync(path.join(_path, "illustration.json"), JSON.stringify(result));
    return result;
  },
  payoff: function(debts, illustration, _path){
    var {payoffSchedule, payoffList} = payoff(debts, illustration);
    var annualPayoff = annualSchedule(payoffSchedule, illustration);
    fs.writeFileSync(path.join(_path, "debt_payoff.json"), JSON.stringify(payoffList));
    fs.writeFileSync(path.join(_path, "monthly.json"), JSON.stringify(payoffSchedule));
    fs.writeFileSync(path.join(_path, "annual.json"), JSON.stringify(annualPayoff));
    return {$illustration: annualPayoff, $debtTragectory: payoffList};
  },
  payoffNM: function(debts, illustration, _path){
    let nonMortgageDebts = debts.filter( d => {
      if(d.type=="d") return d
    })
    var {payoffSchedule, payoffList} = payoff(nonMortgageDebts, illustration);
    var annualPayoff = annualSchedule(payoffSchedule, illustration);
    fs.writeFileSync(path.join(_path, "nm_debt_payoff.json"), JSON.stringify(payoffList));
    fs.writeFileSync(path.join(_path, "nm_monthly.json"), JSON.stringify(payoffSchedule));
    fs.writeFileSync(path.join(_path, "nm_annual.json"), JSON.stringify(annualPayoff));
    return {$illustrationnm: annualPayoff, $debtTragectorynm: payoffList};
  },
  differenceSummary: function(debts, illustration, _path){
    var current = calc.currentPlanInfo(debts);
    var golden = payoff(debts, illustration, Math.ceil(current.years)*12).result;
    var comparison = {
      $debtbalance: current.totalDebt,
      $debtyearsc: current.years,
      $debtfreedatec: current.lastPaymentDate,
      $interestc: current.interest,
      $totalrealdebtc: current.totalRealDebt,
      $totalminpay: current.totalMinPayment,
      $realinterestc: (current.interest * 100)/current.totalRealDebt,
      $debtyears: golden.years,
      $debtfreedate: golden.lastPaymentDate,
      $interest: golden.interest,
      $totalrealdebt: golden.interest+current.totalDebt,
      $interestsaved: current.interest - golden.interest,
      $yearssaved: current.years - golden.years,
      $liquidityc: golden.liquidityc,
      $passonc: golden.passonc,
      $debtmonths: golden.month,
      $cashvalueg: golden.cashvalueg,
      $totalloan: golden.payoff,
      $deathbenefitc: golden.deathbenefitc
    }
    fs.writeFileSync(path.join(_path, "comparison.json"), JSON.stringify(comparison));
    return comparison;
  },
  differenceSummaryNM: function(debts, illustration, _path){
    let nonMortgageDebts = debts.filter( d => {
      if(d.type=="d") return d
    })
    let currentNM = calc.currentPlanInfo(nonMortgageDebts);
    let goldenNM = payoff(nonMortgageDebts, illustration, Math.ceil(currentNM.years)*12).result;
    var comparison = {
      $debtbalancenm: currentNM.totalDebt,
      $debtyearscnm: currentNM.years,
      $debtfreedatecnm: currentNM.lastPaymentDate,
      $interestcnm: currentNM.interest,
      $totalrealdebtcnm: currentNM.totalRealDebt,
      $totalminpaynm: currentNM.totalMinPayment,
      $realinterestcnm: (currentNM.interest * 100)/currentNM.totalRealDebt,
      $debtyearsnm: goldenNM.years,
      $debtfreedatenm: goldenNM.lastPaymentDate,
      $interestnm: goldenNM.interest,
      $totalrealdebtnm: goldenNM.interest+currentNM.totalDebt,
      $interestsavednm: currentNM.interest - goldenNM.interest,
      $yearssavednm: currentNM.years - goldenNM.years,
      $liquiditycnm: goldenNM.liquidityc,
      $passoncnm: goldenNM.passonc,
      $debtmonthsnm: goldenNM.month,
      $cashvaluegnm: goldenNM.cashvalueg,
      $totalloannm: goldenNM.payoff
    }
    fs.writeFileSync(path.join(_path, "nm_comparison.json"), JSON.stringify(comparison));
    return comparison;
  },
  templateData: async function(data, _path){
    let dataString = JSON.stringify(data, null, 2);
    fs.writeFileSync(path.join(_path, "template_data.json"), dataString)
  }
}