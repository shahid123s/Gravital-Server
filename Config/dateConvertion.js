const convertDateToMonthAndYear = (date) =>{
   const  newDate = new Date(date);
   const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
   return formatter.format(newDate);

}


module.exports ={
    convertDateToMonthAndYear,
    
}