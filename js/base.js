;(function(){
	'use strict';
	
	var task_list = []; //本地缓存localStorage的空对象

	var $window = $(window);
	var $body = $('body');
	var $task_delete_trigger;
	var $task_detail_trigger;

	var $task_detail;
	var $task_detail_mask;

	var current_index;
	var $update_form;
	var $task_detail_content;
	var $task_detail_content_input;
	var $checkbox_complete;
	var $msg = $('.msg');        //提醒信息的类名绑定
	var $msg_content = $msg.find('.msg-content');   //定时提醒信息的内容
	var $msg_confirm = $msg.find('.confirmed');     //定时提醒信息的“知道啦”按键
	var $music = $('.music');    //提醒音的类名绑定

	init();

	$(document).ready( function(){
	
		var $form_add_task = $('.add-task');

		$form_add_task.on("submit", function(e) {
			//新输入内容的空对象
			var new_task = {};
			// 禁用默认行为
			e.preventDefault();
			//获取新task的值
			var $input = $(this).find('input[name=content]');
			new_task.content = $input.val();
			// 如果新task的值为空，直接返回，否则继续执行
			if(!new_task.content) return;
			//把新task的值存入缓存
			if(add_task(new_task)) {
				//render_task_list(); //将输入的内容产生item
				$input.val(null);
			}
		})
		$task_detail_mask = $('.task-detail-mask');
		$task_detail_mask.on("click", hide_task_detail);
	})

	//初始化方法
	function init() {
		task_list = store.get('task_list') || [];
		listen_msg_event();
		console.log(task_list);
		//store.clear();
		if(task_list.length){
			render_task_list();	
		}
		task_remind_check();
	}

	//自定义alert方法，同来替换掉浏览器的confirm方法
	function pop(arg){
		
		if(!arg){
			console.error('pop title is error');
		}
		var conf = {};
		var $box;
		var $mask;
		var $title;
		var $content;
		var $confirm;
		var $cancel;
		var dfd;
		var confirmed;
		var timer;

		dfd = $.Deferred();

		if(typeof arg == 'string'){
			conf.title = arg;
		}else{
			conf = $.extend(conf, arg);  //extend类似于angular里面的merge()
		} 
		//自定义确认删除弹框
		$box = $('<div>' +
			'<div class="pop-title">'+ conf.title +'</div>' +
			'<div class="pop-content">'+
				'<div>'+
					'<button style="margin-right: 8px;" class="confirm primary">确定</button>'+
					'<button class="cancel">取消</button>'+
				'</div>' +
			'</div>' +
			'</div>').css({
				color: '#444',
				position: 'fixed',   //相对于浏览器窗口的绝对定位
				width: 300,
				height: 'auto',
				padding: '15px 10px',
				background: '#fff',
				'border-radius': 3,
				'box-shadow': '0 1px 2px rgba(0,0,0,0.5)',
			})

		$title = $box.find('.pop-title').css({
			padding: '5px 10px',
			'font-weight': 900,
			'font-size': 20,
			'text-align': 'center'	
		})
		$content = $box.find('.pop-content').css({
			padding: '5px 10px',
			'text-align': 'center'
		}) 

		$confirm = $content.find('button.confirm');
		$cancel = $content.find('button.cancel');

		$mask = $('<div></div>').css({       //设置阴影幕布的样式
			position: 'fixed',
			background: 'rgba(0,0,0,0.6)',
			top: 0,
			bottom: 0,
			left: 0,
			right: 0,
		})

		timer = setInterval(function(){     //不断判断confirmed值是否变化
			if(confirmed !== undefined){  //confirmed的值一旦改变就清除定时器，移除盒子
				dfd.resolve(confirmed);
				clearInterval(timer);
				dismiss_pop();
			}
		},50)
		//点击确认键
		$confirm.on('click', function(){
			confirmed = true;
		})
		//点击取消键
		$cancel.on('click', function(){
			confirmed = false;
		})
		//点击阴影幕布
		$mask.on('click', function(){
			confirmed = false;
		})

		function dismiss_pop(){
			$mask.remove();
			$box.remove();
		}

		function adjust_box_position(){
			var window_width = $window.width();
			var window_height = $window.height();
			var box_width = $box.width();
			var box_height = $box.height();
			var move_x;
			var move_y;

			move_x = (window_width - box_width) / 2;
			move_y = ((window_height - box_height) / 2) - 10;

			$box.css({
				left: move_x,
				top: move_y,
			})
		}
	
		$window.on('resize', function(){    //浏览器屏幕大小变化时发生resize()事件。
			adjust_box_position();			//则执行自适应浏览器屏幕大小改变
		})

		$mask.appendTo($body);
		$box.appendTo($body);
		$window.resize();
		return dfd.promise();
	}

	//监听提醒信息的弹框
	function listen_msg_event(){
		$msg_confirm.on('click', function(){
			hide_msg();
		})
	}

	//判断提醒时间和系统时间的方法
	function task_remind_check(){
		var current_time;
		var itl = setInterval(function() {
			for(var i = 0; i < task_list.length; i++){
				var item = get(i);
				var task_time;
				if(!item || !item.remind || item.informed){
					continue;
				}
				current_time = (new Date()).getTime();
				task_time = (new Date(item.remind)).getTime();
				if(current_time - task_time >= 1){
					update_task(i, {informed: true});
					show_msg(item.content);
				}
			}
		},500);	
	}

	//显示提醒信息的方法
	function show_msg(msg){
		//$msg = $('.msg');
		//$msg_content = $msg.find('.msg-content');
		//$music = $('.music');
		if(!msg) return;		
		$msg_content.html(msg);
		$music.get(0).play();
		$msg.show(); 
	}

	//隐藏提醒信息的方法
	function hide_msg(){
		//$msg = $('.msg');
		$msg.hide(); 
	}

	//监听task详情页，双击task或者点击“详情”都可以进入
	function listen_task_detail(){
		var index;
		$('.task-item').on('dblclick', function(){
			index = $(this).data('index');
			show_task_detail(index);
		})

		$task_detail_trigger.on('click', function() {
			var $this = $(this);
			//找到detail按钮所在的元素
			var $item = $this.parent().parent();	
			index = $item.data('index');		
			show_task_detail(index);
		});
	}

	//查看task详情
	function show_task_detail(index){
		render_task_detail(index);
		current_index = index;
		//显示详情模板（默认是隐藏的）
		$task_detail.show(); 
		//显示mask模板（默认是隐藏的）
		$task_detail_mask.show();
	}

	//更新task的方法
	function update_task(index, data){
		if(index === undefined || !task_list[index]) return;
		task_list[index] = $.extend({}, task_list[index], data);
		refresh_task();
	}

	//隐藏task详情
	function hide_task_detail(index){
		$task_detail.hide();
		$task_detail_mask.hide();
	}

	//渲染指定task的详细信息
	function render_task_detail(index){
		//如果没有index或者index不存在，则直接返回
		if(index === undefined || !task_list[index]) 
			return;
		var item = task_list[index];
		var tpl = '<form>'+
					'<div class="content">' +
						item.content +	
					'</div>'+
					'<div class="content_input input-item"><input style="display:none;" type="text" name="content" value="'+ (item.content || '') +'"></div>'+
					'<div>'+
						'<div class="desc input-item">'+
							'<textarea name="desc">' + (item.desc || '') + '</textarea>'+
						'</div>'+
					'</div>'+
					'<div class="remind input-item">'+
						'<input class="datetime" name="remind" type="text" value="'+ (item.remind || '') +'">'+			
					'</div>'+
					'<div><button type="submit" class="gx input-item">更新</button></div>'+
					'</form>';
		//清空task详情模板
		$task_detail.html(null);
		//添加新的模板，替换掉空的内容
		$task_detail.html(tpl);
		//选中时间日期的元素
		$('.datetime').datetimepicker();
		//选中form元素
		$update_form = $task_detail.find('form');
		//选中task内容的元素
		$task_detail_content = $update_form.find('.content');
		//选中task input 的元素
		$task_detail_content_input = $update_form.find('[name=content]');
		//当双击内容元素时，显示input，并隐藏自己
		$task_detail_content.on('dblclick',function(){
			$task_detail_content_input.show();
			$task_detail_content.hide();
		})

		$update_form.on('submit', function(e){   //点击提交更新
			e.preventDefault();
			var data = {};
			//获取表单中各个input的值
			data.content = $(this).find('[name=content]').val();
			data.desc = $(this).find('[name=desc]').val();
			data.remind = $(this).find('[name=remind]').val();
			update_task(index, data);
			hide_task_detail();
		})
	}
	
	//查找并监听所有删除按钮的点击事件
	function listen_task_delete(){   //监听事件
		$task_delete_trigger.on('click', function() {
			var $this = $(this);
			//找到delete按钮所在的元素
			var $item = $this.parent().parent();
			var index = $item.data('index');
			//确认删除
			pop("确定删除？")
				.then(function(r){
					r ? delete_task(index) : null;
				})			
		});
	} 

	//监听完成任务的事件
	function listen_checkbox_complete(){
		$checkbox_complete.on('click', function() {
			var $this = $(this);

			var index = $this.parent().parent().data('index');
			var item = get(index);

			if(item.complete){
				update_task(index, {complete: false});
				//$this.attr('checked', true);
			}else{
				update_task(index, {complete: true});
				//$this.attr('checked', false);
			}			
		});
	}

	function get(index){
		return store.get('task_list')[index];
	}

	//添加新的task的方法
	function add_task(new_task) {
		//把新task推入task_list
		task_list.push(new_task);
		//更新localStorage
		refresh_task();
		//console.log('task_list',task_list);
		return true;
	}

	//更新localStorage的方法,并渲染模板
	function refresh_task(){   
		store.set('task_list', task_list);
		render_task_list();
	}

	//删除一条task
	function delete_task(index){
		//如果没有index或者index不存在，则直接返回
		if(index === undefined || !task_list[index]) return;
		delete task_list[index];
		refresh_task();
	}
	

	//渲染全部的task
	function render_task_list() {
		var $task_list = $('.task-list');
		$task_list.html('');
		var complete_items = [];
		for(var i = 0; i < task_list.length; i++){
			var item = task_list[i];
			if(item && item.complete){
				complete_items[i] = item;
			}else{
				var $task = render_task_template(item, i);
			}	
			$task_list.prepend($task);
		}

		for(var j = 0; j < complete_items.length; j++){
			$task = render_task_template(complete_items[j], j);
			if(!$task) continue;
			$task.addClass('completed');
			$task_list.append($task);
		}

		$task_delete_trigger = $('.anchor.delete');
		$task_detail_trigger = $('.anchor.detail');

		$task_detail = $('.task-detail');
		$task_detail_mask = $('.task-detail-mask');
		$checkbox_complete = $('.complete[type=checkbox]');

		listen_task_delete();
		listen_task_detail();
		listen_checkbox_complete();
	}

	//渲染单条task的模板
	function render_task_template(data, index) {
		if(!data || !index) return;
		var list_item_template = 
			'<div class="task-item" data-index="'+ index +'">'+
				'<span><input class="complete" '+ (data.complete ? 'checked': '') +' type="checkbox"></span>'+			
				'<span class="task-content">'+data.content+'</span>'+
				'<span class="fr">'+
					'<span class="anchor delete"> 删除</span>'+
					'<span class="anchor detail"> 详细</span>'+
				'</span>'+
			'</div>';	
		return $(list_item_template);
	}

})();