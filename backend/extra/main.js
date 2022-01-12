const mfunc = require("./mortgage.js");
const dfunc = require("./debt.js");
const {Calendar} = require("./validate");

const _round = (num) => Math.round(num*100)/100;

const calculate = {
  currentPlanInfo: function(debts){
    let result = {
      years: 0,
      lastPaymentDate: "",
      totalMinPayment: 0,
      interest: 0
    }
    let totalDebt = 0;

    let dinfo = null;
    for(var i = 0; i < debts.length; i++){

      if(debts[i].type == "m") dinfo = mfunc.schedule(debts[i], true).summary;
      else dinfo = dfunc.schedule(debts[i]).summary;
      
      result.years = Math.max(result.years, dinfo.installments/12);
      result.interest += dinfo.interest;
      result.totalMinPayment += dinfo.pay;
      totalDebt += debts[i].balance;
    }
    result.lastPaymentDate = new Calendar().add(Math.floor(result.years), Math.floor((result.years - Math.floor(result.years))*12)).string;
    result.totalDebt = totalDebt;
    result.totalRealDebt = totalDebt + result.interest;
    return result;
  },
  sortDebtsBalance: function(debts){ // debt includes both mortgages and debts
    debts.sort(function(a, b){
      if(a.balance < b.balance){
        return -1
      } else if (a.balance > b.balance){
        return 1
      } else {
        if(a.installments < b.installments){
          return -1
        } else if (a.installments > b.installments){
          return 1
        } else {
          return 0
        }
      }
    })
    return debts;
  },
  sortDebtsInstallment: function(debts){ // debt includes both mortgages and debts
    debts.sort(function(a, b){
      if(a.installments < b.installments){
        return -1
      } else if (a.installments > b.installments){
        return 1
      } else {
        if(a.balance < b.balance){
          return -1
        } else if (a.balance > b.balance){
          return 1
        } else {
          return 0
        }
      }
    })
    return debts;
  },
  schedules: function(sortedDebts){ // debt includes both mortgages and debts
    let sched = [];
    for(var i = 0; i < sortedDebts.length; i++){
      if(sortedDebts[i].type == "m") {
        sched.push(mfunc.schedule(sortedDebts[i], false).schedule);
      } else {
        sched.push(dfunc.schedule(sortedDebts[i], true).schedule);
      }
    }
    return sched;
  },
  monthlyIllustration: function(dataAnnual){
    let mIllustration = [];
    let year = -1;
    let prevCV = 0;
    while(dataAnnual[++year]){
      let currCV = dataAnnual[year].currentCV;
      let monthlyProgression = (currCV - prevCV)/12;
      for(let i = 1; i <= 12; i++){
        mIllustration.push({
          month: year*12 + i,
          cv: _round(prevCV + monthlyProgression*i),
          cv80: _round(0.8 * (prevCV + monthlyProgression*i)),
          cv20: _round(0.2 * (prevCV + monthlyProgression*i))
        })
      }
      prevCV = currCV;
    }
    return mIllustration;
  }
}

module.exports = calculate;