/*
    upload.js
    Alphawerk
    2018 
*/

const maxFileSize = 1048576; //1Mb

$(function() {

    $(':file').on('change', function() {
        var file = this.files[0];
        if (file.size > maxFileSize) {
            alert('File too large')
        }
    });

    $(':button').on('click', function() {
        $.ajax({
            // Your server script to process the upload
            url: 'api/upload',
            type: 'POST',
    
            // Form data
            data: new FormData($('form')[0]),
    
            // Tell jQuery not to process data or worry about content-type
            cache: false,
            contentType: false,
            processData: false,
    
            error: function(err) {
                $("error").text(err.responseText);
            },

            // Custom XMLHttpRequest
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if (myXhr.upload) {
                    // For handling the progress of the upload
                    myXhr.upload.addEventListener('progress', function(e) {
                        if (e.lengthComputable) {
                            $('progress').attr({
                                value: e.loaded,
                                max: e.total,
                            });
                        }
                    } , false);
                }
                return myXhr;
            }
        });
    });
});