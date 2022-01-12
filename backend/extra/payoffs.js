const calc = require("./main");
const Calendar = require("./validate").Calendar;
const loanInt = 5;


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
      if(this.result.bal <= 0) this.cleared = true;
      return this.result;
    }
  }
}

module.exports = function(debts, illustration){
  let totalLoan = 0; totalInterest = 0, debtIndex = 0;
  let month = -1;
  const {retireYear, startYear} = illustration;
  const schedules = calc.schedules(calc.sortDebts(debts));
  var monthlycv = calc.monthlyIllustration(illustration.illustration);
  //output variables
  let result = {
    years: 0,
    interestExpense: 0,
    lastPaymentDate: "",
    lastPayment: 0,
    monthlyPayment: 0,
    payoff: 0,
    currcv: 0,
    retirecv: 0
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
  let redirect = 0;

  while(month+1 < monthlycv.length){
    ++month;
    let curr_debt
    if(schedules[debtIndex]){
      curr_debt = schedules[debtIndex][month]
    } else curr_debt = null;
    let monthlycvDeposit = monthlycv[month].cv80 - prevcv;
    prevcv = monthlycv[month].cv80;
    netcv += monthlycvDeposit;
    let payoffTemp = {};

    if(curr_debt && curr_debt.principle <= netcv){
      totalLoan += curr_debt.principle;
      totalInterest += curr_debt.interest;
      redirect += debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].minPayment;
      result.interestExpense += curr_debt.interest;
      result.payoff += curr_debt.principle;
      
      
      if(debts[debtIndex].type == "m") monthlyPay = debts[debtIndex].payment;
      else monthlyPay = debts[debtIndex].minPayment;
      
      payoffTemp.payoff = {
        type: debts[debtIndex].type,
        name: debts[debtIndex].name,
        payoff: curr_debt.principle,
        intPaid: curr_debt.interest
      }
      // payoff list to be used in pdf
      payoffList.push({
        type: debts[debtIndex].type,
        name: debts[debtIndex].name,
        balance: debts[debtIndex].balance,
        IR: debts[debtIndex].rate,
        interestc: debts[debtIndex].interest,
        yearsc: debts[debtIndex].type == "m" ? debts[debtIndex].installmentsWithOverpay : debts[debtIndex].installments,
        real: debts[debtIndex].balance + debts[debtIndex].interest,
        minpay: debts[debtIndex].type == "m" ? debts[debtIndex].payment : debts[debtIndex].minPayment,
        months: month+1,
        date: cal.string,
        loan: curr_debt.principle,
        redirect
      });

      //loan
      let currLoan = curr_debt.principle;
      loanList.push(new Loan(currLoan, loanInt, monthlyPay, month));

      // plan summary info
      result.lastPayment = month+1;
      result.lastPaymentDate = cal.string;
      result.years = (month+1)/12;

      debtIndex++;
    }
    
    // loan clearance
    if(retireCal.compare(cal.value) !== 0){
      if(!retired){
        let outstandingLoan = 0;
        let outLoanList = [...loanList];
        outLoanList.forEach((loan, index) => {
          if(loan.cleared){
            loanList.splice(index, 1);
            savingsDeposit += loan.payment;
          } else {
            outstandingLoan += loan.pay().bal;
          }
        })
        payoffTemp.outstandingLoan = outstandingLoan;
        netcv += preRetirePrevLoan - outstandingLoan;
        preRetirePrevLoan = outstandingLoan;
      } else {
        payoffTemp.outstandingLoan = "-"+retirementOutstandingLoan;
      }
    } else {
      retired = true;
      let outLoanList = [...loanList];
      outLoanList.forEach((loan, index) => {
        if(loan.cleared){
          loanList.splice(index, 1);
        } else {
          retirementOutstandingLoan += loan.pay().bal;
          loanList.shift();
        }
        savingsDeposit += loan.payment;
      })
      netcv -= retirementOutstandingLoan;
      result.retirecv = netcv;
      payoffTemp.outstandingLoan = "-"+retirementOutstandingLoan;
    }
    
    if(schedules[schedules.length-1].length == month){
      result.currcv = netcv
    }

    savings += savingsDeposit;
    payoffTemp = {
      ...payoffTemp,
      month: cal.string,
      deposit: monthlycvDeposit,
      cv20: monthlycv[month].cv20,
      cv80: monthlycv[month].cv80,
      netcv: netcv,
      savings
    }
    payoffSchedule.push(payoffTemp);

    cal.nextMonth();
  }
  return {result, schedules, payoffSchedule, payoffList};
}