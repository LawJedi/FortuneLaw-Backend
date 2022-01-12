const validate = {
  Calendar: class {
    constructor(y, m){
      if(!(y && m)){
        var d = new Date();
        y = parseInt(d.getFullYear());
        m = parseInt(d.getMonth()+1);
      }
      this._start = {y, m};
      this._current = {y: y, m: m};
    }

    nextMonth(){
      if(this._current.m == 12){
        this._current.m = 1;
        this._current.y++;
      } else {
        this._current.m++;
      }
    }

    nextYear(){
      this._current.y++;
    }

    add(y, m){
      if((y == 0 || y == undefined) && m == undefined){
        throw new Error("Invalid argument");
      }
      let addMonth = true;
      if(m == 12) {
        this._current.y++;
        addMonth = false
      } 
      this._current.y += y;
      if(this._current.m + m > 12 && addMonth){
        this._current.y++;
        this._current.m = (this._current.m + m)%12 + 1;
      } else if (this._current.m + m < 12 && addMonth){
        this._current.m += m
      }
      return this;
    }

    reset(y, m){
      if(!(y && m)){
        this._current = {...this._start};
      }
      this._start = {y, m};
      this._current = {y: y, m: m};
    }

    compare(dateObj){
      // inner > outer -> +ve
      // inner < outer -> +ve
      // difference = months
      var diff = (this._current.y - dateObj.y)*12 + (this._current.m - dateObj.m);
      return diff;
    }

    get value(){
      return this._current;
    }

    get string(){
      var monthArray = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthArray[this._current.m-1]}. ${this._current.y}`
    }
  }
}

module.exports = validate;