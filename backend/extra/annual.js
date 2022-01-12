const {Calendar} = require("./validate")

module.exports = function(payoffData, ill){
  var annualData = [];
  let year = ill.startYear.y, sl = 0, cvl = 0, liq, passon;
  let {illustration} = ill;
  var cal = new Calendar();
  for(var i = 0; i < payoffData.length; i++){
    let d = payoffData[i];
    sl += d.savingsLoan;
    if(!!d.payoff){
      cvl += d.payoff.payoff
    }
    if((i)%12 == 0 && i != 0){
      year++;
      let yi = Math.floor(i/12)-1;
      liq = d.netcv + d.cv20 + d.savings;
      passon = illustration[yi].db + d.savings;

      annualData.push({
        index: yi+1,
        year,
        premium: illustration[yi].premium,
        cv: illustration[yi].currentCV,
        db: illustration[yi].db,
        sl: sl,
        cvl,
        eoy: d.outstandingLoan, // original d.outstandingLoan
        cv80: d.netcv,
        cv20: d.cv20,
        sb: d.savings,
        liq,
        passon
      })

      sl = 0;
      cvl = 0;
    }
    cal.nextMonth();
  }
  return annualData;
}