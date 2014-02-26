require 'fileutils'


desc 'Build the Reader'
task :build do
  system("substance --bundle")
  FileUtils.mv "dist/substance-reader-0.4.0.js", "dist/substance-reader-0.4.0.min.js"
  system("substance --bundle nominify")
end