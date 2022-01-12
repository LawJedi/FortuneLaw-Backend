const calc = require("./main");
const Calendar = require("./validate").Calendar;
const loanInt = 5;
const fs = require("fs");

class Loan {
  constructor(bal, rate, pay){
    this.balance = bal;
    this.rate = rate/1200;
    this.payment = pay;
    this.m = 0;
    this.cleared = false;
    this.result = {bal:this.balance, int: 0};
  }

  pay(){
    var b = this.balance, c = this.payment, r = this.rate;
    if(!this.cleared){
      let m = ++this.m;
      if(m == 1){
       this.result.bal -= c;
       this.result.int = 0; 
       return this.result;
      }
      this.result.bal = parseFloat((Math.pow(1+r, m)*b - (Math.pow(1+r, m)-1)*c/r).toFixed(2));
      this.result.int = parseFloat((((b*r)-c)*((Math.pow(1+r, m) - 1)/r) + m*c).toFixed(2));
      if(this.result.bal <= 0) {this.cleared = true;this.result.bal = 0}
      return this.result;
    }
  }

  incPayment(xval){
    this.payment += xval;
  }
}

module.exports = function(debts, illustration, dfm){
  let totalLoan = 0; totalInterest = 0, debtIndex = 0;
  let month = -1;
  const {retireYear, startYear} = illustration;
  const schedules = calc.schedules(calc.sortDebtsBalance(debts));
  var monthlycv = calc.monthlyIllustration(illustration.illustration);

  // let dfm = null;
  // if(schedules.length == 0){
  //   dfm = 0;
  // } else {
  //   dfm = schedules[schedules.length-1].length;
  //   console.log(schedules[schedules.length - 1][0])
  // }

  //output variables
  let result = {
    years: 0,
    interest: 0,
    lastPaymentDate: "",
    month: 0,
    payoff: 0,
    cashvalueg: 0,
    retirecv: 0,
    liquidityc: 0,
    deathbenefitc: 0
  }
  let savingsDeposit = 0;
  let savings = 0;
  let netcv = 0;
  let prevcv = 0;
  let monthlyPay = 0;
  let payoffSchedule = [];

  // loan 
  let loanList = [];
  var cal = new Calendar();
  var retireCal = new Calendar(retireYear.y, retireYear.m);
  let preRetirePrevLoan = 0;
  let retirementOutstandingLoan = 0;
  let retired = false;
  let payoffList = [];
  let savingsLoan = 0;
  let redirect = 0;
  let outLoan = 0;

  while(month+1 < monthlycv.length){
    ++month;
    let curr_debt
    if(schedules[debtIndex]){
      curr_debt = schedules[debtIndex][month] // change month-1 to month if debt installments are being paid at the end of every months
      while(!curr_debt){
        redirect += debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].minPayment;
        payoffList.push({
          type: debts[debtIndex].type,
          name: debts[debtIndex].name,
          balance: debts[debtIndex].balance,
          IR: debts[debtIndex].rate,
          actpay: debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].actualPayment,
          interestc: debts[debtIndex].interest,
          yearsc: debts[debtIndex].type == "m" ? debts[debtIndex].installmentsWithOverpay/12 : debts[debtIndex].installments/12,
          real: debts[debtIndex].balance + debts[debtIndex].interest,
          minpay: debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].minPayment,
          months: month+1,
          date: cal.string,
          loan: 0,
          redirect
        })

        payoffSchedule[month-1].payoff = {
          type: debts[debtIndex].type,
          name: debts[debtIndex].name,
          payoff: 0,
          intPaid: debts[debtIndex].interest
        }
        
        debtIndex++;
        if(debtIndex == schedules.length) break;
        curr_debt = schedules[debtIndex][month]
      }
    } else curr_debt = null;
    let monthlycvDeposit = monthlycv[month].cv80 - prevcv;
    prevcv = monthlycv[month].cv80;
    netcv += monthlycvDeposit;
    let payoffTemp = {};

    if(curr_debt && curr_debt.principle <= netcv + savings){
      let currLoan;
      if(savings > curr_debt.principle){
        savings -= curr_debt.principle;
        savingsLoan = curr_debt.principle;
        currLoan = 0;
      } else {
        currLoan = curr_debt.principle - savings;
        savingsLoan = savings;
        savings = 0;
      }
      totalLoan += curr_debt.principle; // if only loan from cv is considered add currLoan instead of principle
      totalInterest += curr_debt.interest;
      redirect += debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].minPayment;
      result.interest += curr_debt.interest;
      result.payoff += curr_debt.principle;
            
      if(debts[debtIndex].type == "m") monthlyPay = debts[debtIndex].payment;
      else monthlyPay = debts[debtIndex].minPayment;
      
      payoffTemp.payoff = {
        type: debts[debtIndex].type,
        name: debts[debtIndex].name,
        payoff: currLoan,
        intPaid: curr_debt.interest
      }
      // payoff list to be used in pdf
      payoffList.push({
        type: debts[debtIndex].type,
        name: debts[debtIndex].name,
        balance: debts[debtIndex].balance,
        IR: debts[debtIndex].rate,
        actpay: debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].actualPayment,
        interestc: debts[debtIndex].interest,
        yearsc: debts[debtIndex].type == "m" ? debts[debtIndex].installmentsWithOverpay/12 : debts[debtIndex].installments/12,
        real: debts[debtIndex].balance + debts[debtIndex].interest,
        minpay: debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].minPayment,
        months: month+1,
        date: cal.string,
        loan: curr_debt.principle,
        redirect
      });

      //loan
      // original
      // loanList.push(new Loan(currLoan, loanInt, repay, month));
      if(outLoan < 0) outLoan = 0;
      outLoan += currLoan;

      // plan summary info
      result.month = month+1;
      result.lastPaymentDate = cal.string;
      result.years = (month+1)/12;
      
      debtIndex++;
    }
    
    // loan clearance
    if(retireCal.compare(cal.value) !== 0){
      if(!retired){
        let outstandingLoan = 0;
        if(outLoan > 0){
          let paidToPrinciple = redirect - (outLoan*5/1200);
          outstandingLoan = outLoan - paidToPrinciple;
          outLoan = outstandingLoan;
        }
        payoffTemp.outstandingLoan = outstandingLoan;
        netcv += preRetirePrevLoan - outstandingLoan;
        preRetirePrevLoan = outstandingLoan;
      } else {
        payoffTemp.outstandingLoan = "-"+retirementOutstandingLoan;
      }
    } else {
      retired = true;
      if(outLoan < 0) outLoan = 0;
      retirementOutstandingLoan = outLoan;
      netcv -= retirementOutstandingLoan;
      result.retirecv = netcv;
      payoffTemp.outstandingLoan = "-"+retirementOutstandingLoan;
      redirect = 0;
      savingsDeposit = 0;
    }
    
    if(outLoan <= 0) savings += redirect;
    if(dfm == month){
      result.cashvalueg = netcv;
      result.liquidityc = netcv + monthlycv[month].cv20 + savings;
      result.passonc = savings + illustration.illustration[Math.floor((month)/12)-1].db;
      result.deathbenefitc = illustration.illustration[Math.floor((month)/12)-1].db;
    }

    payoffTemp = {
      ...payoffTemp,
      month: cal.string,
      deposit: monthlycvDeposit,
      cv20: monthlycv[month].cv20,
      cv80: monthlycv[month].cv80,
      netcv: netcv,
      savings,
      savingsLoan
    }
    payoffSchedule.push(payoffTemp);
    savingsLoan = 0;

    cal.nextMonth();
  }
  return {result, schedules, payoffSchedule, payoffList};
}