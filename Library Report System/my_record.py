# Name: Jung-De(Jordan), Chiou 
# Student ID: s4068959
# The highest level I have attempted: HD


import sys
import datetime

#----- Class of "Book" -----#
class Book:
    
    def __init__(self, ID, borrow_days={}, name="", type='', ncopy=0, lcharge=0):
        self.__ID = ID
        self.__borrow_days = borrow_days # A dictionary to store the borrowed data. Key is memberID, value is the days or R.
        self.__name = name
        self.__type = type
        self.__ncopy = ncopy
        self.__lcharge = lcharge
        self.__num_borrow_members = 0
        self.__num_reservations = 0
        self.get_num_borrow_members_and_reservations() # update the instnace variable -- num_borrow_members and num_reservations
        self.get_range_borrow_days() # update the instnace variable -- range_borrow_days, index[0] is lowerbound, index[1] is upperbound

    @property
    def ID(self):
        return self.__ID
    
    @property
    def borrow_days(self):
        return self.__borrow_days
    
    @property
    def name(self):
        return self.__name
    
    @property
    def type(self):
        return self.__type
    
    @property
    def ncopy(self):
        return self.__ncopy
    
    @property
    def lcharge(self):
        return self.__lcharge
    
    @property
    def num_borrow_members(self):
        return self.__num_borrow_members
    
    @property
    def num_reservations(self):
        return self.__num_reservations
    
    @ID.setter
    def ID(self, new_ID):
        self.__ID = new_ID

    @borrow_days.setter
    def borrow_days(self, new_borrow_days):
        self.__borrow_days = new_borrow_days
        self.get_num_borrow_members_and_reservations() # when change the borrow_days, update the number of borrow_members and reservations
        self.get_range_borrow_days()

    def add_borrow_days(self, member_ID, days):
        """
        Add/Update the dictionary of the info that which member borrowed this book object for how long
        """
        self.__borrow_days[member_ID] = days
        self.get_num_borrow_members_and_reservations() # when change the borrow_days, update the number of borrow_members and reservations
        self.get_range_borrow_days()

    @name.setter
    def name(self, new_name):
        self.__name = new_name

    @type.setter
    def type(self, new_type): # if the object created with only ID given, this setter gives the room to assign a type to the Book object
        self.__type = new_type

    @ncopy.setter
    def ncopy(self, new_ncopy):
        self.__ncopy = new_ncopy

    @lcharge.setter
    def lcharge(self, new_lcharge):
        self.__lcharge = new_lcharge
    
    @num_borrow_members.setter
    def num_borrow_members(self, new_num):
        self.__num_borrow_members = new_num
        self.get_popularity()
    
    @num_reservations.setter
    def num_reservations(self, new_num):
        self.__num_reservations = new_num
        self.get_popularity()
  
    def get_num_borrow_members_and_reservations(self):
        """
        calculate the number that this book had been borrowed by how many members
        """
        num_borrow_members = 0
        num_reservations = 0
        for value in self.borrow_days.values():
            if value != 'R': # if the value is R, meaning that the member haven't borrowed the book yet, so it won't be count
                num_borrow_members += 1
            else: # if value = 'R'
                num_reservations += 1
        self.num_borrow_members = num_borrow_members # add the instance variable
        self.num_reservations = num_reservations

    def get_range_borrow_days(self):
        lower_bound = None
        upper_bound = None
        for days in self.borrow_days.values():
            if days != 'R': # avoid error and skip reservations
                days = int(days) #turn str into int
                if lower_bound is None or lower_bound > days:
                    lower_bound = days
                if upper_bound is None or days > upper_bound:
                    upper_bound = days

        # if there are no borrow days values
        if lower_bound is None or upper_bound is None:
            self.range_borrow_days = [0, 0]
        else:
            self.range_borrow_days = [lower_bound, upper_bound]  # add the instance variable

    def get_popularity(self):
        self.popularity = self.num_borrow_members + self.num_reservations

class Textbook(Book):
    maxday = 14
    
class Fiction(Book):
    
    def __init__(self, ID, borrow_days, name, type, ncopy, maxday, lcharge):
        super().__init__(ID, borrow_days, name, type, ncopy, lcharge)
        
        if maxday > 14:
            self.__maxday = maxday
        else: # when violates the "maxday should larger than 14 days" rule, print message and terminates program.
            print("The Fiction-type book's maximum borrowing days can't smaller than 14.")
            print(f"The book {self.ID} ({self.name}) violates this rule.")
            sys.exit(1)

    @property
    def maxday(self):
        return self.__maxday
    
    @maxday.setter
    def maxday(self, new_maxday):
        self.__maxday = new_maxday

#----- Class of "Member" -----#
class Member:
    average_borrow_days = 0 # this static variable cans be updated by Record().calculate_member_average_borrow_days()

    def __init__(self, ID, borrow_days={}, Fname = "", Lname="", DOB="", type=''):
        self.__ID = ID
        self.__borrow_days = borrow_days # A dictionary to store the borrowed data. Key is book ID, value is the days or R. For records file.
        self.__Fname = Fname
        self.__Lname = Lname
        self.__DOB = DOB
        self.__type = type
        
        self.get_total_borrow_days() # create total_borrow_days instance variable for the member
        self.get_borrow_numbers() # create borrow_number instance variable for the member

    @property
    def ID(self):
        return self.__ID
    
    @property
    def borrow_days(self):
        return self.__borrow_days
    
    @property
    def Fname(self):
        return self.__Fname
    
    @property
    def Lname(self):
        return self.__Lname
    
    @property
    def DOB(self):
        return self.__DOB
    
    @property
    def type(self):
        return self.__type

    @borrow_days.setter
    def borrow_days(self, new_borrow_days):
        self.__borrow_days = new_borrow_days

    def add_borrow_days(self, book_ID, days):
        """
        Add/Update the dictionary of the info that which book was borrowed by this member for how long and recalculate totals.
        """
        self.__borrow_days[book_ID] = days
        self.get_total_borrow_days()
        self.get_borrow_numbers()

    def get_total_borrow_days(self):
        """ 
        calculate the total_borrow_days of the member
        """
        total_borrow_days = 0
        for days in self.borrow_days.values(): # get values from dictionary
            if days != 'R': # exclude R (reservation) to correctly calculate total_borrow_days
                days = int(days) # change data type from str to int to calculate
                total_borrow_days += days
        
        self.total_borrow_days = total_borrow_days # add the total_borrow_days as an instance variable

    def get_borrow_numbers(self):
        """
        calculate the book's number that this customer had borrowed before
        """
        borrow_numbers = 0
        for value in self.borrow_days.values():
            if value != 'R': # if the value is R, meaning that the member haven't borrowed the book yet, so it won't be count
                borrow_numbers += 1
        self.borrow_numbers = borrow_numbers

class Standard(Member):
    
    def __init__(self, ID, borrow_days={}, Fname="", Lname="", DOB="", type='', record=object):
        super().__init__(ID, borrow_days, Fname, Lname, DOB, type)
        self.record = record # import record object to use find_book function
        self.num_textbooks = 0 # the number of textbooks are borrowing or reserving
        self.num_fictions =  0 # the number of fictions are borrowing or reserving
        self.each_member_avg_borrow_days = 0
        self.borrow_limitation = [False, False] # index[0] is the limitation status of Textbook, index[1] is for Fiction, if True means the member's borrow number of textbook or fiction exceed the limitaion for Standard membership.
        self.fee = 0

    @Member.borrow_days.setter
    def borrow_days(self, new_borrow_days):
        """
        This setter is for the user replacing the whole dictionary of borrow_days
        """
        self.__borrow_days = new_borrow_days
        self.get_total_borrow_days() # update total_borrow_days
        self.get_borrow_numbers() # update borrow_numbers
        self.update_num_textbooks_and_finctions() # update num_textbooks and num_fictions
        self.update_average_borrow_days() # update the average_borrow_days of the member

    def add_borrow_days(self, book_ID, days):
        """
        This method is for the user only updating or adding one key-value pair.
        Add/Update the dictionary of the info that which book was borrowed by this member for how long and recalculate totals.
        """
        self.borrow_days[book_ID] = days
        self.get_total_borrow_days() # update total_borrow_days
        self.get_borrow_numbers() # update borrow_numbers
        self.update_num_textbooks_and_finctions() # update num_textbooks and num_fictions
        self.update_average_borrow_days() # update the average_borrow_days of the member

    def update_num_textbooks_and_finctions(self):
        """
        This func is used in add_borrow_days() or borrow_days.setter, so when updating the borrow days dictionary, automatically calculate again the number of borrowing or reserving
        After update the num_textbook and num_fiction, it will check the borrow limitation as well and updating it if needed.
        """
        self.num_textbooks = 0 # initialize the value to correctly calculate every time
        self.num_fictions = 0
        for book_ID in self.borrow_days.keys():
            book_obj = self.record.find_book(book_ID)
            if isinstance(book_obj, Textbook):
                self.num_textbooks += 1
            elif isinstance(book_obj, Fiction):
                self.num_fictions += 1
        
        self.check_borrow_limitation() #update borrow limitation status after calculating the number of textbooks and fictions

    def update_average_borrow_days(self):
        """
        Use self.total_borrow_days / self.borrow_numbers to self.average_borrow_days
        """
        if self.borrow_numbers > 0: # avoid zero division
            self.each_member_avg_borrow_days = self.total_borrow_days / self.borrow_numbers

    def calculate_fee(self):
        """
        This method will check and update how much fee the member should pay.
        """
        self.fee = 0 # initialize the variable

        for book_id, member_borrow_days in self.borrow_days.items(): # go through the whole borrow days record of the member

            # check the book's corresponding max borrowing day limitation
            if member_borrow_days != 'R': # if it's 'R' then skip it
                book_obj = self.record.find_book(book_id)
                if book_obj is not None:
                    days_limit = int(book_obj.maxday)
                    late_charge = float(book_obj.lcharge)
                    member_borrow_days = int(member_borrow_days)
                    if member_borrow_days > days_limit:
                        exceed_days = member_borrow_days - days_limit
                        self.fee += exceed_days * late_charge
                else:
                    print("Sorry! Some book ID in member's borrow days records cannot find in book database.")
                    sys.exit(1)

    def check_borrow_limitation(self):
        """
        This method is used to check whether the member violates the borrow limitation. Standard [Textbook < 2, Fiction < 3]
        """
        # check the borrow limitation for Standard member
        if self.num_textbooks > 1:
            self.borrow_limitation[0] = True
        if self.num_fictions > 2:
            self.borrow_limitation[1] = True


class Premium(Standard):
    """
    Everthing is the same as Standard member, only the borrow limitation up to 2 textbooks and 3 fictions (borrow or reserve) at one time.
    """

    def check_borrow_limitation(self):
        """
        This method is used to check whether the member violates the borrow limitation. Fiction [Textbook < 3, Fiction < 4]
        """
        # check the borrow limitation for Standard member
        if self.num_textbooks > 2:
            self.borrow_limitation[0] = True
        if self.num_fictions > 3:
            self.borrow_limitation[1] = True

#----- Class of "Record" -----#
class Records:
    
    def __init__(self):
        self.book_list = [] 
        self.member_list = [] 

    def read_records(self, records_file_name, num_commend_input):
        with open(records_file_name, "r") as file:
            line = file.readline()

            if not line.strip(): # check whether the file is empty
                print(f"Sorry! The record file {records_file_name} is empty.")
                sys.exit(1)

            while line: # loop until the line become empty
                fields = line.strip().split(",")

                # check the record file format is correct or not misread the other file.
                # If the following line is empty or consists of whitespace only, it will be consider wrong format as well.
                if (not line.strip()) or (not fields[0].startswith("B") and not fields[1].strip().startswith("M")):
                    print(f"The format of record file {records_file_name} is incorrect!")
                    sys.exit(1)

                # check the Book ID is start with "B" and followed by only digits
                if not (fields[0].startswith("B") and fields[0][1:].isnumeric()) or int(fields[0][1:]) <= 0:
                    print(f"The format of Book ID \"{fields[0]}\" in record file is incorrect! It should start with 'B' and followed only by positive digits.")
                    sys.exit(1)

                book_ID = fields[0]
                borrow_days = {}

                # Create borrow_days dictionary based on the record file
                for borrow_data in fields[1:]:
                    
                    ## check 'days' is valid integer or the value 'R'
                    try:
                        member_ID, days = borrow_data.split(": ") # store member ID and the days he/she borrowed into variables
                        if days != 'R':
                            days = int(days)
                            if days <= 0:
                                raise ValueError
                    except ValueError:
                        member_ID = borrow_data.split(": ")[0] # update the invalid member ID to correctly print out 
                        member_ID = member_ID.rstrip(":") # remove the : at the end
                        print(f"The borrow days value of \"{member_ID.strip()}\" at {book_ID} is invalid.")
                        sys.exit(1)

                    ## check the format of member ID is start with "M" and followed only by digits
                    member_ID = member_ID.strip() # remove the blank space before M
                    if not (member_ID.startswith("M") and member_ID[1:].isnumeric()) or int(member_ID[1:]) <= 0:
                        print(f"The format of Member ID \"{member_ID}\" in record file is incorrect! It should start with 'M' and followed only by positive digits.")
                        sys.exit(1)

                    borrow_days[member_ID] = days # store borrow days key-value pair for Book()

                    ## Check whether the corresponding member object already exists in database
                    member_obj = self.find_member(member_ID)
                    if num_commend_input == 3: # means user has indicated the member file
                        if member_obj is None: # check whether all the MID in record file exist.
                            print(f"Sorry! The member ID \"{member_ID}\" in record file does not exist in member file! Please check again.")
                            sys.exit(1)
                        else: 
                            member_obj.add_borrow_days(book_ID, days) #add/update the borrowing info to the customer

                    else: # user only indicated record file or book file
                        if member_obj is None: # means the memberID does not exist in current dbs
                            member_borrow_days = {}
                            member_borrow_days[book_ID] = days # store borrow days key_value pair for Member()
                            member_obj = Member(member_ID, member_borrow_days) 
                            self.member_list.append(member_obj)
                        else: #if the mermber ID already exists
                            member_obj.add_borrow_days(book_ID, days) #add/update the borrowing info to the customer

                #Check whether the book object already exists
                book_obj = self.find_book(book_ID) # find the corresponding book object in book_list
                if num_commend_input == 3 or num_commend_input == 2: # means user has indicated the book file
                    if book_obj is None:
                        print(f"Sorry! The book ID \"{book_ID}\" in record file does not exist in book file! Please check again.")
                        sys.exit(1)
                    else:
                        book_obj.borrow_days = borrow_days
                else: # only indicated record file 
                    if book_obj is None: # If the user only input record file, the book database won't have been created.
                        book_obj = Book(book_ID, borrow_days)
                        self.book_list.append(book_obj)
                    else: # The book object exists
                        book_obj.borrow_days = borrow_days

                line = file.readline() # read next line in record file

    def read_books(self, books_file_name):
        with open(books_file_name, "r") as file:
            line = file.readline()
            
            if not line.strip(): # check whether the file is empty
                print(f"Sorry! The book file {books_file_name} is empty.")
                sys.exit(1)

            while line: # loop until the file become empty
                fields = line.strip().split(",")

                # check the book file format is correct or not misread the other file.
                # If the following line is empty or consists of whitespace only, it will be consider wrong format as well.
                if (not line.strip()) or (len(line) != 6 and not fields[0].startswith("B") and not (fields[2].strip() == "T" or fields[2].strip() == "F")):
                    print(f"The format of book file {books_file_name} is incorrect!")
                    sys.exit(1)

                # check the Book ID is start with "B" and followed by only digits
                if not (fields[0].startswith("B") and fields[0][1:].isnumeric()) or int(fields[0][1:]) <= 0:
                    print(f"The format of Book ID \"{fields[0]}\" in book file is incorrect! It should start with 'B' and followed only by positive digits.")
                    sys.exit(1)

                # Check the type first to decide which class to use
                if fields[2].strip().lower() == 't':
                    book_obj = Textbook(fields[0], {}, fields[1].strip(), fields[2].strip(), int(fields[3].strip()), float(fields[-1].strip())) #ID, borrow_days, name, type, ncopy, lcharge
                elif fields[2].strip().lower() == 'f':
                    book_obj = Fiction(fields[0], {}, fields[1].strip(), fields[2].strip(), int(fields[3].strip()), int(fields[4].strip()), float(fields[-1].strip())) #ID, borrow_days, name, type, ncopy, maxday, lcharge

                self.book_list.append(book_obj)

                line = file.readline()

    def read_members(self, members_file_name):
        with open(members_file_name, "r") as file:
            line = file.readline()

            if not line.strip(): # check whether the file is empty
                print(f"Sorry! The member file {members_file_name} is empty.")
                sys.exit(1)

            while line: # loop until the line become e
                fields = line.strip().split(",")
                
                # check the member file format is correct or not misread the other file.
                # If the following line is empty or consists of whitespace only, it will be consider wrong format as well.
                if (not line.strip()) or (len(line) != 5 and not fields[0].startswith("M") and not (fields[-1].strip() == "Standard" or fields[-1].strip() == "Premium")):
                    print(f"The format of member file {members_file_name} is incorrect!")
                    sys.exit(1)

                # check the Member ID is start with "M" and followed by only digits
                if not (fields[0].startswith("M") and fields[0][1:].isnumeric()) or int(fields[0][1:]) <= 0:
                    print(f"The format of Member ID \"{fields[0]}\" in member file is incorrect! It should start with 'M' and followed only by positive digits.")
                    sys.exit(1)

                if fields[-1].strip().lower() == 'standard':
                    member_obj = Standard(fields[0], {}, fields[1].strip(), fields[2].strip(), fields[3].strip(), fields[-1].strip(), self) # ID, borrow_days, Fname, Lname, DOB, type, record_object
                elif fields[-1].strip().lower() == 'premium':
                    member_obj = Premium(fields[0], {}, fields[1].strip(), fields[2].strip(), fields[3].strip(), fields[-1].strip(), self)
                
                self.member_list.append(member_obj)
                line = file.readline()

    def display_records(self):
        # get all book IDs, the sequence will be the same as the records file from top to bottom
        book_ID_list =[]
        for book_obj in self.book_list:
            book_ID_list.append(book_obj.ID)

        # print header part
        header = "| Member IDs".ljust(12)
        for book_ID in book_ID_list:
            header += f"{book_ID}".rjust(8) # create each book ID's columns header

        total_width = len(header) + 2 # the +2 is for the space added by " |" at the end of the header

        print("\nRECORDS")
        print("-" * total_width) # use total_width to automatically adjust the printing width
        print(header + " |")
        print("-" * total_width)

        # print each member's borrowed books info
        for member_obj in self.member_list:
            row = f"| {member_obj.ID}".ljust(12) # create member ID field, ordered according to the sequence they were read in

            ## go through the bookID list so the sequence of data retrieving from member's borrow_days will be the same as the header displayed
            for book_ID in book_ID_list: 
                days = member_obj.borrow_days.get(book_ID, "xx") # get the value of bookID from borrow_days dictionary, if no such key-value pair, retrieving the default "xx"
                if days == "R": #turn R into -- to display correctly
                    days = "--"
                row += f"{days}".rjust(8) # create the fields of each book's borrowing info of the member
            
            print(row + " |")

        # print RECORDS SUMMARY
        number_of_books = len(book_ID_list)
        number_of_members = len(self.member_list)
        self.calculate_member_average_borrow_days() # update the average_borrow_days value in Member class
        print("-" * total_width)
        print("RECORDS SUMMARY")
        print(f"There are {number_of_members} members and {number_of_books} books.")
        print(f"The average number of borrow days is {Member.average_borrow_days:.2f} (days).\n")

    def dispay_books(self):
        
        # print textbook header part
        header = "| Book IDs".ljust(12) + "Name".ljust(15) + "Type".ljust(10)
        header += "Ncopy".rjust(10) + "Maxday".rjust(12) + "Lcharge".rjust(12) + "Nborrow".rjust(12) + "Nreserve".rjust(12) + "Range".rjust(8)

        total_width = len(header) + 3 # the +3 is for the space added by " |" at the end of the header

        print("TEXTBOOK INFORMATION")
        print("-" * total_width) # use total_width to automatically adjust the printing width
        print(header + "  |")
        print("-" * total_width)

        #print each textbook's info
        textbook_list = []
        fiction_list = []
        for book_obj in self.book_list: # filter out textbook and fiction obj first
            if isinstance(book_obj, Textbook):
                textbook_list.append(book_obj)
            elif isinstance(book_obj, Fiction):
                fiction_list.append(book_obj)

        # define a lambda to use as the key for sort(), this lambda will take the parameter(x) and return it's 'name' attribute
        book_name = lambda x: x.name

        # The book_name will take the item in the textbook_list which are textbook objects, then return their book name.
        # And the sort function will take the book name as sorting key. The default for string sorting is using alphabet from A to Z
        textbook_list.sort(key = book_name)
        fiction_list.sort(key = book_name) # do the same sortation to fictions

        for book_obj in textbook_list:
            textbook_row = f"| {book_obj.ID:<10}{book_obj.name:<15}" + "Textbook".ljust(10)
            textbook_row += f"{book_obj.ncopy:>10}{Textbook.maxday:>12}{book_obj.lcharge:>12.1f}{book_obj.num_borrow_members:>12}{book_obj.num_reservations:>12}"
            textbook_row += f"    {f"{book_obj.range_borrow_days[0]}-{book_obj.range_borrow_days[1]}":<5}"
        
            print(textbook_row + " |")
        print("-" * total_width)

        # print fictionbook header part
        
        print("\nFICTION BOOK INFORMATION")
        print("-" * total_width) # use total_width to automatically adjust the printing width
        print(header + "  |")
        print("-" * total_width)

        for book_obj in fiction_list:
            fiction_row = f"| {book_obj.ID:<10}{book_obj.name:<15}" + "Fiction".ljust(10)
            fiction_row += f"{book_obj.ncopy:>10}{book_obj.maxday:>12}{book_obj.lcharge:>12.1f}{book_obj.num_borrow_members:>12}{book_obj.num_reservations:>12}"
            fiction_row += f"    {f"{book_obj.range_borrow_days[0]}-{book_obj.range_borrow_days[1]}":<5}"
            
            print(fiction_row + " |")
        
        # print BOOK SUMMARY
        popular_book_list = self.get_popular_books() # go through all the books and get the most popular book list
        popular_books = ", ".join(popular_book_list) # join the list as strings
        print("-" * total_width)
        print("BOOK SUMMARY")
        if len(popular_book_list) == 1: #single
            print(f"The most popular book is \"{popular_books}\".")
        elif len(popular_book_list) > 1: #plural
            print(f"The most popular book are \"{popular_books}\".")
        
        longest_book_list, longest_borrow_days = self.get_longest_borrow_days()
        longest_books = ", ".join(longest_book_list)
        if len(longest_book_list) == 1: #single
            print(f"The book \"{longest_books}\" has the longest borrow days ({longest_borrow_days} days).\n")
        elif len(longest_book_list) > 1: #plural
            print(f"The books \"{longest_books}\" have the longest borrow days ({longest_borrow_days} days).\n")

    def display_members(self):
        # print standard memebers header part
        header = "| Member IDs".ljust(15) + "FName".ljust(10) + "Lname".ljust(10)
        header += "Type".rjust(10) + "DOB".rjust(15) + "Ntextbook".rjust(12) + "Nfiction".rjust(10) + "Average".rjust(10) + "Fee(AUD)".rjust(10)

        total_width = len(header) + 2 # the +2 is for the space added by " |" at the end of the header

        print("STANDARD MEMBER INFORMATION")
        print("-" * total_width) # use total_width to automatically adjust the printing width
        print(header + " |")
        print("-" * total_width)

        #updating some attributes that will be used to display later, then sort standard and premium object 
        standard_list = []
        premium_list = []
        for member_obj in self.member_list:
            
            ## calculate member's fee and update the attribute
            member_obj.calculate_fee()
            
            if isinstance(member_obj, Standard) and not isinstance(member_obj, Premium): # premium is inherent from standard, so need to exclude them
                standard_list.append(member_obj)
            elif isinstance(member_obj, Premium):
                premium_list.append(member_obj)
        
        # define a lambda to use as the key for sort(), this lambda will take the parameter(x) and return it's 'fee' attribute
        member_fee = lambda x: x.fee

        # do the same thing as book's lambda but use fee to sort
        standard_list.sort(key = member_fee, reverse=True) # let it sort by fee from high to low 
        premium_list.sort(key = member_fee, reverse=True) # do the same sortation to premium

        #print each standard member's info
        for member_obj in standard_list:

            ## turn DOB into correct print format
            origin_date_string = member_obj.DOB
            date_time = datetime.datetime.strptime(origin_date_string, "%m/%d/%Y")
            formatted_date = date_time.strftime("%d-%b-%Y")

            ## Check whether the borrow_limitation is violated.
            Ntextbook = member_obj.num_textbooks
            Nfiction = member_obj.num_fictions
            if member_obj.borrow_limitation[0] is True: # check the validity of textbook
                Ntextbook = f"{member_obj.num_textbooks}!" # if ture add '!'
            if member_obj.borrow_limitation[1] is True: # check the validity of fiction
                Nfiction = f"{member_obj.num_fictions}!"
            
            ## print the row
            standard_row = f"| {member_obj.ID:<13}{member_obj.Fname:<10}{member_obj.Lname:<10}"
            standard_row += f"{member_obj.type:>10}{formatted_date:>15}{Ntextbook:>12}{Nfiction:>10}{member_obj.each_member_avg_borrow_days:>10.2f}{member_obj.fee:>10.2f}"    
            
            print(standard_row + " |")
        print("-" * total_width)

        #print premium table header
        print("\nPREMIUM MEMBER INFORMATION")
        print("-" * total_width) # use total_width to automatically adjust the printing width
        print(header + " |")
        print("-" * total_width)

        #print each Premium member's info
        for member_obj in premium_list:

            ## turn DOB into correct print format
            origin_date_string = member_obj.DOB
            date_time = datetime.datetime.strptime(origin_date_string, "%m/%d/%Y")
            formatted_date = date_time.strftime("%d-%b-%Y")

            ## Check whether the borrow_limitation is violated.
            Ntextbook = member_obj.num_textbooks
            Nfiction = member_obj.num_fictions
            if member_obj.borrow_limitation[0] is True: # check the validity of textbook
                Ntextbook = f"{member_obj.num_textbooks}!" # if ture add '!'
            if member_obj.borrow_limitation[1] is True: # check the validity of fiction
                Nfiction = f"{member_obj.num_fictions}!"
            
            ## print the row
            premium_row = f"| {member_obj.ID:<13}{member_obj.Fname:<10}{member_obj.Lname:<10}"
            premium_row += f"{member_obj.type:>10}{formatted_date:>15}{Ntextbook:>12}{Nfiction:>10}{member_obj.each_member_avg_borrow_days:>10.2f}{member_obj.fee:>10.2f}"    
            
            print(premium_row + " |")

        # print MEMBER SUMMARY
        print("-" * total_width)
        print("MEMBER SUMMARY")
        active_member_obj = self.get_active_member()
        print(f"The most active member is \"{active_member_obj.Fname} {active_member_obj.Lname}\" with {active_member_obj.sum_text_fict} books borrowed/reserved.")
        least_avg_member_obj = self.get_least_avg_member()
        print(f"The member with the least average number of borrowing days is \"{least_avg_member_obj.Fname} {least_avg_member_obj.Lname}\" with {least_avg_member_obj.each_member_avg_borrow_days} days.\n")

    def find_book(self, search_value):
        """
        User can use book ID or name to find corresponding book object to obtain detail info of the book
        The lower() function is to mitigate user input errors.
        """
        search_value = search_value.lower()
        for book in self.book_list:
            if book.ID.lower() == search_value or book.name.lower() == search_value:
                return book # if find matching book, returning the Book object
        return None # means no such object in current book dbs
    
    def find_member(self, search_value):
        """
        User can use book ID or name to find corresponding book object to obtain detail info of the book
        The lower() function is to mitigate user input errors.
        """
        search_value = search_value.lower()
        for member in self.member_list:
            if member.ID.lower() == search_value or member.Fname.lower() == search_value or member.Lname.lower() == search_value:
                return member # if find matching member, returning the Member object
        return None # means no such object in current member dbs

    def calculate_member_average_borrow_days(self):
        """
        calculate the member's data in the member_list and update the static variable -- average_borrow_days in Member class
        """
        all_borrow_days = 0
        all_borrow_numbers = 0
        for member_obj in self.member_list:
            all_borrow_days += member_obj.total_borrow_days #increment every member's total borrow days
            all_borrow_numbers += member_obj.borrow_numbers

        if all_borrow_numbers > 0:  # Avoid division by zero
            average_borrow_days = all_borrow_days / all_borrow_numbers
        else:
            average_borrow_days = 0

        Member.average_borrow_days = average_borrow_days

    def get_popular_books(self):
        """
        Go through the book_list and find books that possess the highest popularity (number of borrow members + number of reservations)
        """
        max_popularity = 0
        most_popular_books = []
        # update the max_popularity variable to max value of popularity in the whole book_list
        for book_obj in self.book_list:
            if book_obj.popularity > max_popularity:
                max_popularity = book_obj.popularity
        
        # check which book object has the same value of max_popularity, appending it to the popular book list
        for book_obj in self.book_list:
            if book_obj.popularity == max_popularity:
                most_popular_books.append(book_obj.name)
        
        return most_popular_books

    def get_longest_borrow_days(self):
        """
        Go through the book_list and find books that possess the longest borrow days
        """
        longest_borrow_days = 0
        longest_borrow_days_books = []
        # update the longest_borrow_days variable to max value of borrow days in the whole book_list
        for book_obj in self.book_list:
            if book_obj.range_borrow_days[1] > longest_borrow_days:
                longest_borrow_days = book_obj.range_borrow_days[1]

        # check which book object has the same value of longest_borrow_days, appending it to the longest book list
        for book_obj in self.book_list:
            if book_obj.range_borrow_days[1] == longest_borrow_days:
                longest_borrow_days_books.append(book_obj.name)

        return longest_borrow_days_books, longest_borrow_days

    def get_active_member(self):
        """
        Go through the member_list and find the most active member (have max number of borrows and reservations)
        """
        max_borrowed_reserved = 0
        # update the max_borrowed_reserved variable to max value in the whole member_list
        for member_obj in self.member_list:
            sum_borrowed_reserved = member_obj.num_textbooks + member_obj.num_fictions
            member_obj.sum_text_fict = sum_borrowed_reserved
            if sum_borrowed_reserved > max_borrowed_reserved:
                max_borrowed_reserved = sum_borrowed_reserved
        
        # check which member object has the same value of max_borrowed_reserved, return it.
        for member_obj in self.member_list:
            if member_obj.sum_text_fict == max_borrowed_reserved:
                return member_obj

    def get_least_avg_member(self):
        """
        Go through the member_list and find the least average number of borrowing days member.
        """
        least_avg = None
        # update the least_avg variable to min value in the whole member_list
        for member_obj in self.member_list:
            if least_avg is None or member_obj.each_member_avg_borrow_days < least_avg:
                least_avg = member_obj.each_member_avg_borrow_days
        
        # check which member object has the same value of max_borrowed_reserved, return it.
        for member_obj in self.member_list:
            if member_obj.each_member_avg_borrow_days == least_avg:
                return member_obj

#----- Class of "Main" -----#
class Main:
    
    def __init__(self):
        self.record = Records()
        num_command_input = self.load_file() # load files from commend line
        self.record.display_records()
        if num_command_input == 2:
            self.record.dispay_books()
        elif num_command_input == 3:
            self.record.dispay_books()
            self.record.display_members()
        self.write_report(num_command_input)

    def load_file(self):
        """
        1. Read the command line input first to check the file name is should read.
        2. Execute record.read_records function to load in records data.
        """
        command_line_input = sys.argv[1:] # read the command line input but exclude this file's name itself (my_record.py)
        file_not_find_list = [] # store the file name that cannot be found in local directory

        if len(command_line_input) == 0:
            print("[Usage:] python my_record.py <record file>")
            sys.exit(1)
        
        elif len(command_line_input) == 1:
            # if user only indicates record file, the program will base on the ID in the file to create Book and Member object
            try:
                self.record.read_records(command_line_input[0], 1) #read input record file name
            except FileNotFoundError:
                print(f"Sorry! Can't find the file \"{command_line_input[0]}\" in the local directory.")
                sys.exit(1)
        
        elif len(command_line_input) == 2:
            # if user indicates books file, read books info first to build up detailed book database
            # Then read record file to update the borrow days info in the Book() object
            
            #read input book file name 
            try:
                self.record.read_books(command_line_input[1]) 
            except FileNotFoundError:
                file_not_find_list.append(command_line_input[1]) # if cannot found the file, appending it into list to print out 

            #read input record file name
            try:
                self.record.read_records(command_line_input[0], 2) 
            except FileNotFoundError:
                file_not_find_list.append(command_line_input[0])
            
            # if file_not_find_list is not empty -> some files can't be found
            if file_not_find_list:
                notfound_files = ", ".join(file_not_find_list)
                print(f"Sorry! Can't find the input files: {notfound_files} in the local directory.")
                sys.exit(1)
            else:
                return 2 # if succed read the above two file, then return the number of command line input to proceed 

        elif len(command_line_input) == 3:
            # if user indicates members file, read books info first to build up detailed book database, and then read members file.
            # Finally, read record file to update the borrow days info in the Book() and Member() object
            
            #read input book file name 
            try:
                self.record.read_books(command_line_input[1]) 
            except FileNotFoundError:
                file_not_find_list.append(command_line_input[1]) # if cannot found the file, appending it into list to print out 

            #read input member file name 
            try:
                self.record.read_members(command_line_input[2]) 
            except FileNotFoundError:
                file_not_find_list.append(command_line_input[2]) # if cannot found the file, appending it into list to print out 

            #read input record file name
            try:
                self.record.read_records(command_line_input[0], 3)
            except FileNotFoundError:
                file_not_find_list.append(command_line_input[0])

            # if file_not_find_list is not empty -> some files can't be found
            if file_not_find_list:
                notfound_files = ", ".join(file_not_find_list)
                print(f"Sorry! Can't find the input files: {notfound_files} in the local directory.")
                sys.exit(1)
            else:
                return 3 # if succed read the above two file, then return the number of command line input to proceed 

        else:
            print("Sorry! Please follow the correct CML format: python my_record.py <record file> <book file> <member file>")
            sys.exit(1)

    def write_report(self, num_command_input): # Reference [1]
        """
        After print on the terminal, this function will print the same outcome in the reports.txt file
        """
        original_stdout = sys.stdout # store the original stdout, which points to terminal
        try:
            with open("reports.txt", 'a') as file: #use append mode to add new report at the bottom of the txt
                sys.stdout = file # re-define the sys.stdout. Let it points to the file(reports.txt)
                print(f" ☟ The report generated time: {datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")} ☟ ")
                self.record.display_records()
                if num_command_input == 2:
                    self.record.dispay_books()
                elif num_command_input == 3:
                    self.record.dispay_books()
                    self.record.display_members()
        finally: # avoid unanticipated error occured, sys.stdout still be the original one.
            sys.stdout = original_stdout # reset the stdout to original setting

            
#----- Run Code Area ------#
main = Main()


# Reference:
# [1] GeeksforGeeks (2024) Ways to save python terminal output to a text file, GeeksforGeeks. Available at: https://www.geeksforgeeks.org/ways-to-save-python-terminal-output-to-a-text-file/ (Accessed: 12 June 2024). 

# Documentation:
# Due to limited time, there are still many areas that I feel could be better organized and modularized to simplify the entire project. 
# Currently, the code contains quite a few repetitive segments, and some attribute planning could be rearranged.
# For instance, the Member class does not actually need attributes like Fname and such; these attributes could be placed in the Standard class instead.
# One of the more challenging aspects this time was initially using a list to store book and member objects. 
# Since most queries are based on ID, I found that traversing the entire list each time was inefficient. As a result, I temporarily switched to using a dictionary for storage. 
# However, I found this approach uncomfortable for subsequent calls, so I reverted to using a list.
# Compared to the previous assignment, I wrote this one much faster, as I am now more familiar with object-oriented programming.
# Regarding the sorting for printing, I spent quite a while figuring it out. Eventually, I discovered that I could use lambda functions, but it also took some time to combine this with the sort functionality. 
# I had to revisit the course materials to understand it better.