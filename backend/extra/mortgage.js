const model = require("./model.js");

const round = (n) => Math.round(n*100)/100;

module.exports = {
  info(mortgages){
    var record = [];
    for(var i = 0; i < mortgages.length; i++){
      let temp = {
        type: "m",
        name: mortgages[i][model.mortgage.name],
        balance: mortgages[i][model.mortgage.balance],
        payment: mortgages[i][model.mortgage.payment],
        overpay: mortgages[i][model.mortgage.overpay],
        rate: mortgages[i][model.mortgage.rate],
        yearsLeft: mortgages[i][model.mortgage.yearsLeft]
      };
      let paidData = this.schedule(temp, true).summary;
      temp.installments = this.schedule(temp).summary.installments
      temp.installmentsWithOverpay = paidData.installments;
      temp.interest = paidData.interest;
      record.push(temp);
    }
    return record;
  },
  schedule(mortgage, includeOverpay){
    let bal = mortgage.balance, pay = mortgage.payment, 
    overpay = mortgage.overpay, rate = mortgage.rate;
    let int = 0, month = 1, schedule= [];

    if(!includeOverpay) overpay = 0;
    let firstInt = (bal*rate/1200)
    if(pay <= firstInt){
      throw new Error("inv_debt_mp : "+mortgage.name)
    }

    while (bal > 0){
      let currInt = round(bal*rate/1200);
      if(pay >= bal + currInt){
        pay = bal + currInt
      }
      int += currInt;
      var currPrinciple = pay - currInt
      bal -= currPrinciple;

      schedule.push({
        month,
        principle: bal,
        interest: int,
        paidToInterest: currInt,
        paidToPrinciple: currPrinciple
      })

      if(month%12 == 11) pay += overpay;
      if(month%12 == 12) pay -= overpay;
      month++;
    }
    var result = {
      summary: {
        interest: int,
        installments: month-1,
        pay: mortgage.payment
      },
      schedule
    }
    return result;
  }
}