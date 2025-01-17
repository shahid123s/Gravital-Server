const convertDateToMonthAndYear = (date) =>{
   const  newDate = new Date(date);
   const formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });
   return formatter.format(newDate);

}


module.exports ={
    convertDateToMonthAndYear,
    
}