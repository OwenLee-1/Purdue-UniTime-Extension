// MAIN-world script: stop RMP UI clicks from reaching GWT dismiss handlers.
(function () {
  var RMP_SEL =
    '.rmp-professor-panel,#rmp-page-settings-host,.rmp-hover-preview,.rmp-badge-host';
  var CATCHER_SEL = '#rmp-freeze-catcher,.rmp-sidebar-backdrop';
  var POPUP_SEL =
    '.gwt-PopupPanel, .gwt-DialogBox, .unitime-Dialog, [role="dialog"]';
  var SWALLOW_ATTR = 'data-rmp-gesture-swallow-until';
  var FREEZE_ATTR = 'data-rmp-freeze-active';
  var TYPES = ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup'];

  function isRmpTarget(e) {
    var t = e.target;
    return !!(t && t.closest && t.closest(RMP_SEL));
  }

  function shieldBubble(e) {
    if (isRmpTarget(e)) e.stopImmediatePropagation();
  }

  TYPES.forEach(function (type) {
    document.addEventListener(type, shieldBubble, false);
    window.addEventListener(type, shieldBubble, false);
  });

  function isFreezeActive() {
    if (document.documentElement.hasAttribute(FREEZE_ATTR)) return true;
    var catcher = document.getElementById('rmp-freeze-catcher');
    return !!(catcher && catcher.isConnected);
  }

  function isGestureSwallowing() {
    var until = parseInt(
      document.documentElement.getAttribute(SWALLOW_ATTR) || '0',
      10
    );
    return Date.now() < until;
  }

  function isFrozenOrSwallowing() {
    return isFreezeActive() || isGestureSwallowing();
  }

  function targetInPopup(target) {
    return !!(target && target.closest && target.closest(POPUP_SEL));
  }

  function shouldCancelGwt(nativeEvent) {
    if (!nativeEvent) return false;

    if (nativeEvent.type === 'keydown' && nativeEvent.key === 'Escape') {
      return isFrozenOrSwallowing();
    }

    if (isFrozenOrSwallowing()) {
      var target = nativeEvent.target || nativeEvent.srcElement;
      if (targetInPopup(target)) return false;
      return true;
    }

    var target = nativeEvent.target || nativeEvent.srcElement;
    if (target && target.closest) {
      if (target.closest(RMP_SEL)) return true;
      if (target.closest(CATCHER_SEL)) return true;
    }

    return false;
  }

  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key !== 'Escape' || !isFrozenOrSwallowing()) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  function hookGwtNativePreview() {
    var gwt =
      window.com &&
      window.com.google &&
      window.com.google.gwt &&
      window.com.google.gwt.user &&
      window.com.google.gwt.user.client &&
      window.com.google.gwt.user.client.Event;
    var Event = gwt || window.__gwt_Event;
    if (!Event || Event.__rmpHooked || typeof Event.addNativePreviewHandler !== 'function') {
      return false;
    }

    Event.__rmpHooked = true;
    Event.addNativePreviewHandler(function (event) {
      try {
        var nativeEvent = event.getNativeEvent && event.getNativeEvent();
        if (shouldCancelGwt(nativeEvent)) event.cancel();
      } catch (err) {
        /* ignore */
      }
    });
    return true;
  }

  if (!hookGwtNativePreview()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (hookGwtNativePreview() || attempts > 200) clearInterval(timer);
    }, 50);
  }
})();
