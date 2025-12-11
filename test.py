string = ""
for i in range(1001, 10001):
    string += str(i) + '\n'

with open("./static/words_set.txt", "w") as f:
    f.write(string)
