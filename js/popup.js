
 var app = angular.module('stockWatchApp',[]);
 app.controller('stockWatchController', function ($scope, $http, $interval) {
    $scope.message = "";
    $scope.stocksData = [];
    $scope.tickerArr = [];
    $scope.expandedArr = [];
    $scope.chartURLArrKey = [];
    $scope.chartURLArrVal = [];
	
    //Show associated chart
    $scope.changeChartURL = function(data,val){
      data.duration = val;
      var symbol = data.Symbol;
      var idx = $scope.chartURLArrKey.indexOf(symbol);
      if(idx>=0){
        $scope.chartURLArrVal[idx] = val;
      }else{
        $scope.chartURLArrVal[idx] = '1d';
      }
      data.chartURL = val;
    };
    
        //Method get current time used to generated random number
	$scope.getCurrentTime = function(){
		var objToday = new Date();
		dayOfMonth = objToday.getDate();
		curMonth = objToday.getMonth();
		curYear = objToday.getFullYear();
		curHour = objToday.getHours();
		curMinute = objToday.getMinutes();
		curSeconds = objToday.getSeconds();
		var today = curHour + "" + curMinute + "" + curSeconds + "" + dayOfMonth + "" + curMonth + "" + curYear;
		return today;
	};
	
    //Setting default chart
    $scope.chartInit = function(data){
      if(data.chartURL === undefined){
        data.chartURL = '1d';  
      }
    };
    
    //Functionality for + button
    $scope.expandedClick = function(data){
      var symbol = data.Symbol;
      data.expanded = !data.expanded;
      if($scope.expandedArr.indexOf(symbol)>=0){
        $scope.expandedArr.splice($scope.expandedArr.indexOf(symbol),1);
      }else{
        $scope.expandedArr = $scope.expandedArr.concat([symbol]);  
      }
      
    }
    
    //Get json response for given tickers separated by comma
    $scope.loadStockDataFromTickr = function(tickers){
	  var columns = "LastTradeTime%2CSymbol%2CChange%2CPercentChange%2CLastTradePriceOnly%2CName%2COpen%2CPreviousClose%2CYearHigh%2CYearLow%2CLastTradeDate";
      tickers = tickers + "%2C%22" +$scope.getCurrentTime() +"%22";//:D
	  var url = "http://query.yahooapis.com/v1/public/yql?q=select%20"+ columns +"%20from"+
                "%20yahoo.finance.quotes%20where%20symbol%20IN%20("
                +tickers+
                ")&format=json&env=http://datatables.org/alltables.env";
      $http.get(url).then(
        function(response){
            $scope.stocksData = [].concat(response.data.query.results.quote);
			$scope.stocksData = $scope.stocksData.slice(0,$scope.stocksData.length-1);
            if($scope.tempData != ''){
              for(var i =0; i < $scope.stocksData.length;++i){
                var symbol = $scope.stocksData[i].Symbol;
                if($scope.expandedArr.indexOf(symbol) >=0){
                  $scope.stocksData[i].expanded = true;  
                }else{
                  $scope.stocksData[i].expanded = false;  
                }
                var idx = $scope.chartURLArrKey.indexOf(symbol);
                if(idx >=0){
                  $scope.stocksData[i].chartURL = $scope.chartURLArrVal[idx];  
                }else{
                  $scope.chartURLArrKey[i] = symbol;
                  $scope.chartURLArrVal[i] = '1d';
                  $scope.stocksData[i].chartURL = '1d';
                }
              }  
            }
            $scope.lastupdatedtime = $scope.stocksData[0].LastTradeDate  + " "+ $scope.stocksData[0].LastTradeTime;
        }, function(response){
          console.log("error");
      });
    };
    
    //Delete ticker 
    $scope.deleteTicker = function(data){
      var itemArr = $scope.tickerArr;
      var index = itemArr.indexOf(data.Symbol);
      
      var expandedIdx = $scope.expandedArr.indexOf(data.Symbol);
      $scope.expandedArr = $scope.expandedArr.splice(expandedIdx,1);
      
      var chartIdx = $scope.chartURLArrKey.indexOf(data.Symbol);
      $scope.chartURLArrKey = $scope.chartURLArrKey.splice(chartIdx,1);
      $scope.chartURLArrVal = $scope.chartURLArrVal.splice(chartIdx,1);
      if (index > -1) {
        itemArr.splice(index, 1);
      }
      if(itemArr.length == 0){
        itemArr = [];
      }
      chrome.storage.sync.set({ "tickers" : itemArr }, function() {
            if (chrome.runtime.error) {
              $scope.message = "Error deleting stock";
            }else{
              $scope.stocksData.splice(index,1);
              $scope.$apply();
            }
          }); 
    };
    
    
    $scope.reloadStockData = function(){
      chrome.storage.sync.get("tickers", function(items) {
        if (!chrome.runtime.error) {
          if(items.tickers !== undefined){
            var itemArr = items.tickers;
            var itemStr = "";
            $scope.tickerArr = itemArr;
            for(var i = 0; i < itemArr.length;  ++i){
              if(itemArr[i] == '') continue;
              if(i == itemArr.length-1){
                itemStr += "%22" + itemArr[i] + "%22";
              }else{
                itemStr += "%22" + itemArr[i] + "%22,";  
              }
            }
            if(itemStr != ''){
              $scope.loadStockDataFromTickr(itemStr);  
            }
          }else{
            $scope.message = "There are no stocks in watch list, Enter Ticker id below to start watching.";
          }
        }
      });
    };
    
    //Check if given ticker is valid
    $scope.addToWatchList = function(){
      var tckr = $scope.tckrEntered;
      if(!tckr){
        $scope.message = "Please enter a ticker";
        return;
      }
      var url = "http://query.yahooapis.com/v1/public/yql?q=select%20LastTradePriceOnly%20from"+
          "%20yahoo.finance.quotes%20where%20symbol%20IN%20(%22"
          +tckr+
          "%22)&format=json&env=http://datatables.org/alltables.env";
      $http.get(url).then(
        function(response){
          if(!response.data.query.results.quote.LastTradePriceOnly){
            $scope.message = "Ticker " + tckr + " is not available";
          }else{
            $scope.AddTickerToChrome();
            $scope.message = "";
          }
        }, function(response){
          console.log("error");
        });
    };
    
    //Added new stocks entered by user to chrome storage
    $scope.AddTickerToChrome = function(){
      chrome.storage.sync.get("tickers", function(items) {
        if (!chrome.runtime.error) {
          var ticks = [$scope.tckrEntered];
          if(items.tickers !== undefined){
            ticks = ticks.concat(items.tickers);
          }
          ticks = ticks.filter(function (item, pos) {return ticks.indexOf(item) == pos;});
          chrome.storage.sync.set({ "tickers" : ticks }, function() {
            if (chrome.runtime.error) {
              $scope.message = "Error! Stock not added to watch list";
            }else{
              $scope.reloadStockData();
              $scope.tckrEntered = "";
            }
          }); 
        }else{
          $scope.message = "Error! Stock not added to watch list";
        }
      });
    };
    $scope.reloadStockData();
    
    //refresh stock every 7 seconds
    $interval($scope.reloadStockData,7000);
});
