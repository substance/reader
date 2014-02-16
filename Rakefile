require 'fileutils'


desc 'Build the Reader'
task :build do
  # FileUtils.cd(COMPOSER_SRC_DIR) do  # chdir
  system("substance --bundle")
  FileUtils.mv "dist/substance-reader-0.5.0.js", "dist/substance-reader-0.5.0.min.js"
  system("substance --bundle nominify")
  # end # return to original directory
end