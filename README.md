# What is `biblio`?

`biblio` is a library for extracting and preparing freely available content for building MOBI ebook files using Amazon's `kindlegen`.

The following books are extracted:

- `Power from on High` from http://signaturebookslibrary.org/power-from-on-high/

The pipeline consists of

- retrieving URLs containing the text,
- applying a transformation into an intermediate format, and then
- applying the transformation to a set of handlebars templates.  

The output is a set of files in the `./build` directory that can then be executed via Amazon's [kindlegen](https://www.amazon.com/gp/feature.html?docId=1000234621) as follows:

```
kindlegen ./build/book.opf -o power_from_on_high.mobi
```

# Next Books Planned:
http://signaturebookslibrary.org/new-mormon-history/

# Thanks
Thanks to https://www.aliciaramirez.com/2014/05/how-to-make-a-kindle-ebook-from-scratch/ for providing the initial details on how to build an Amazon Kindle ebook (mobi format).

# TODO
- Add command line args for building specific books
- Add conference from 2017 April and October

# Other Notes

To spider a website, you can use `wget`.  Example:

```
wget --recursive \
 http://signaturebookslibrary.org/power-from-on-high/ \
 -olog --user-agent=Mozilla \
 --remote-encoding=utf-8 \
 --restrict-file-names=nocontrol \ --accept-regex="power-from"
```
