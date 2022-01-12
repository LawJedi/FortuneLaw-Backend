const model = require("./model.js");
const round = (n) => Math.round(n*100)/100;

module.exports = {
  info(debts){
    var record = [];
    for(var i = 0; i < debts.length; i++){
      var temp = {
        type: "d",
        name: debts[i][model.debt.name],
        balance: debts[i][model.debt.balance],
        minPayment: debts[i][model.debt.minPayment],
        actualPayment: debts[i][model.debt.actualPayment],
        rate: debts[i][model.debt.rate],
        overpay: debts[i][model.debt.actualPayment] - debts[i][model.debt.minPayment],
      }
      let paidData = this.schedule(temp, false).summary;
      temp.installments = paidData.installments;
      temp.interest = paidData.interest;
      record.push(temp);
    }
    return record;
  },
  schedule(debt, min){
    let bal = debt.balance, minPay = debt.minPayment,
    actPay = debt.actualPayment, rate = debt.rate;
    let int = 0, month = 1, schedule= [];
    let pay = actPay;
    if(!!min) pay = minPay;
    
    // check validity of payment
    let firstInt = (bal*rate/1200);
    if(firstInt >= pay){
      throw new Error("inv_debt_mp : "+debt.name)
    }

    while (bal > 0){
      var currInt = round(bal*rate/1200)
      if(pay >= bal + currInt){
        pay = bal + currInt
      }
      int += currInt;
      bal -= (pay - currInt);

      schedule.push({
        month,
        principle: bal,
        interest: int,
        paidToInterest: currInt,
        paidToPrinciple: (pay - currInt)
      })
      month++;
    }
    var result = {
      summary: {
        interest: int,
        installments: month-1,
        pay: debt.minPayment
      },
      schedule: schedule
    };
    return result
  }
}
