function getCombs(cards, r) {
    const combinations = [];
  
    function backtrack(start, currentComb) {
      if (currentComb.length == r) {
        combinations.push([...currentComb]); 
        return;
      };
  
      for (let i = start; i < cards.length; i++) {
        currentComb.push(cards[i]);
        backtrack(i+1, currentComb);
        currentComb.pop();
  
      };
    };
    backtrack(0, []);
    return combinations
  };

console.log(getCombs(["A", "B", "C", "D"], 2))
