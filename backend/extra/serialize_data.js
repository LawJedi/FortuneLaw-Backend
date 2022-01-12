module.exports = function(first, last, agent, data){
  var date = new Date();
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let outputJSON = {
    $first: first,
    $last: last,
    $agent: agent,
    ...data,
    $date: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }
  return outputJSON;
}