    function toggleSearch() {
      var bar = document.getElementById('search-bar');
      var btn = document.getElementById('search-btn');
      var isOpen = bar.classList.contains('open');
      if (isOpen) { bar.classList.remove('open'); btn.classList.remove('active-btn'); clearSearch(); }
      else { bar.classList.add('open'); btn.classList.add('active-btn'); setTimeout(function () { document.getElementById('search-input').focus(); }, 280); }
    }
    function onSearch(val) {
      searchQuery = val.trim();
      document.getElementById('search-clear-btn').style.display = val ? 'flex' : 'none';
      render();
    }
    function clearSearch() {
      searchQuery = '';
      document.getElementById('search-input').value = '';
      document.getElementById('search-clear-btn').style.display = 'none';
      render();
    }

